const router = require("express").Router();
const db = require("../db");
const { isWorkingTime, calculateWorkingDeadline, extendDeadline, getNextWorkingTime } = require("./workTime");

const SUPER_ADMIN = process.env.SUPER_ADMIN_LOGIN || 'admin';

router.post("/check-working-hours", async (req, res) => {
  try {
    const working = isWorkingTime(new Date());
    if (!working) {
      await db.query("UPDATE assembly_tasks SET status = 'paused' WHERE status = 'in_progress'");
      await db.query("UPDATE routine_tasks SET status = 'paused' WHERE status = 'in_progress'");
      res.json({ status: 'paused', message: 'Нерабочее время - задачи приостановлены' });
    } else {
      await db.query("UPDATE assembly_tasks SET status = 'in_progress' WHERE status = 'paused'");
      await db.query("UPDATE routine_tasks SET status = 'in_progress' WHERE status = 'paused' AND assigned_to IS NOT NULL");
      res.json({ status: 'working', message: 'Рабочее время - задачи активны' });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/", async (req, res) => {
  try {
    const tasks = await db.query(`
      SELECT t.*, 
        COALESCE((SELECT COUNT(*) FROM task_items ti WHERE ti.task_id = t.id), 0) as total_items,
        COALESCE((SELECT COUNT(*) FROM task_items ti WHERE ti.task_id = t.id AND ti.status = 'completed'), 0) as completed_items
      FROM assembly_tasks t ORDER BY t.created_at DESC
    `);
    res.json(tasks.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/:id/items", async (req, res) => {
  try {
    const items = await db.query("SELECT * FROM task_items WHERE task_id = $1 ORDER BY sort_order, id", [req.params.id]);
    res.json(items.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/items/:id/components", async (req, res) => {
  try {
    const comps = await db.query("SELECT * FROM subtask_components WHERE task_item_id = $1", [req.params.id]);
    res.json(comps.rows);
  } catch (e) { res.json([]); }
});

router.post("/", async (req, res) => {
  try {
    const { device_id, device_name, created_by, created_by_login, subtasks } = req.body;

    const assembledCheck = await db.query(
      "SELECT * FROM assembled_devices WHERE device_name = $1 AND component_type = 'component' AND quantity > 0",
      [device_name]
    );
    const assembledComponents = assembledCheck.rows;

    const task = await db.query(
      "INSERT INTO assembly_tasks (device_id, device_name, created_by, created_by_login, status) VALUES ($1,$2,$3,$4,'active') RETURNING *",
      [device_id, device_name, created_by, created_by_login]
    );
    const taskId = task.rows[0].id;

    if (subtasks && Array.isArray(subtasks)) {
      let sortOrder = 1;

      for (const subtask of subtasks) {
        const isAssembled = assembledComponents.some(ac => ac.component_name === subtask.name);

        if (isAssembled) {
          const component = assembledComponents.find(ac => ac.component_name === subtask.name);
          if (component) {
            if (component.quantity > 1) {
              await db.query("UPDATE assembled_devices SET quantity = quantity - 1 WHERE id = $1", [component.id]);
            } else {
              await db.query("DELETE FROM assembled_devices WHERE id = $1", [component.id]);
            }
          }
          await db.query(
            "INSERT INTO task_items (task_id, subtask_name, time_estimate, sort_order, status) VALUES ($1,$2,0,$3,'completed')",
            [taskId, subtask.name, sortOrder]
          );
          sortOrder++;
          continue;
        }

        const taskItem = await db.query(
          "INSERT INTO task_items (task_id, subtask_name, time_estimate, sort_order, status) VALUES ($1,$2,$3,$4,'pending') RETURNING *",
          [taskId, subtask.name, subtask.time_estimate || 240, sortOrder]
        );
        const taskItemId = taskItem.rows[0].id;

        if (subtask.components && Array.isArray(subtask.components)) {
          for (const comp of subtask.components) {
            const qty = parseInt(comp.quantity) || 0;
            const componentId = comp.item_id || comp.consumable_id || comp.component_id || null;
            const itemType = comp.item_type || (comp.item_id ? 'item' : comp.consumable_id ? 'consumable' : null);
            if (!componentId || !itemType) continue;

            await db.query(
              "INSERT INTO subtask_components (task_item_id, item_type, component_id, component_name, quantity, unit) VALUES ($1,$2,$3,$4,$5,$6)",
              [taskItemId, itemType, componentId, comp.component_name, qty, comp.unit || 'шт.']
            );

            if (itemType === 'item') {
              await db.query("UPDATE items SET quantity = GREATEST(0, quantity - $1) WHERE id = $2", [qty, componentId]);
            } else if (itemType === 'consumable') {
              await db.query("UPDATE consumables SET quantity = GREATEST(0, quantity - $1) WHERE id = $2", [qty, componentId]);
            }
          }
        }
        sortOrder++;
      }
    }

    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${created_by_login || 'Система'}] Создал задачу на сборку: "${device_name}"`]);
    res.json(task.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/:id/status", async (req, res) => {
  try {
    const { status, user_id, user_login } = req.body;
    const taskId = parseInt(req.params.id);
    const task = await db.query("SELECT * FROM assembly_tasks WHERE id = $1", [taskId]);
    if (task.rows.length === 0) return res.status(404).json({ error: "Задача не найдена" });
    const isSuperAdmin = (user_login || '').toLowerCase() === SUPER_ADMIN.toLowerCase();
    if (!isSuperAdmin && task.rows[0].created_by !== user_id) return res.status(403).json({ error: "Только создатель" });
    if (status === 'in_progress') {
      const hasAssigned = await db.query("SELECT COUNT(*) as count FROM task_items WHERE task_id = $1 AND assigned_to IS NOT NULL", [taskId]);
      if (parseInt(hasAssigned.rows[0].count) === 0) return res.status(400).json({ error: "Сначала назначьте исполнителей" });
    }
    await db.query("UPDATE assembly_tasks SET status = $1 WHERE id = $2", [status, taskId]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Изменил статус задачи #${taskId} на "${status}"`]);
    res.json({ message: "Статус обновлён" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/items/:id/assign", async (req, res) => {
  try {
    const { assigned_to, assigned_login, time_estimate } = req.body;
    const item = await db.query("SELECT * FROM task_items WHERE id = $1", [req.params.id]);
    if (item.rows.length === 0) return res.status(404).json({ error: "Не найдена" });
    const em = time_estimate || item.rows[0].time_estimate || 240;
    const deadline = calculateWorkingDeadline(new Date(), em);
    await db.query("UPDATE task_items SET assigned_to=$1, assigned_login=$2, deadline=$3, status='in_progress', time_estimate=$4 WHERE id=$5",
      [assigned_to, assigned_login, deadline, em, req.params.id]);
    await db.query("INSERT INTO notifications (user_id, user_login, message, task_id, task_item_id, notification_type) VALUES ($1,$2,$3,$4,$5,'task')",
      [assigned_to, assigned_login, `📋 "${item.rows[0].subtask_name}". Срок: ${deadline.toLocaleString('ru-RU')}`, item.rows[0].task_id, req.params.id]);
    await db.query("UPDATE assembly_tasks SET status='in_progress' WHERE id=$1 AND status NOT IN ('completed','cancelled')", [item.rows[0].task_id]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${assigned_login}] Назначен на подзадачу "${item.rows[0].subtask_name}" (задача #${item.rows[0].task_id})`]);
    res.json({ ok: true, deadline });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/items/:id/complete", async (req, res) => {
  try {
    const { completed_by, completed_login } = req.body;
    const itemId = parseInt(req.params.id);
    const item = await db.query("SELECT * FROM task_items WHERE id = $1", [itemId]);
    if (item.rows.length === 0) return res.status(404).json({ error: "Не найдена" });
    if (item.rows[0].status === 'completed') return res.status(400).json({ error: "Уже выполнена" });
    const data = item.rows[0];

    // Добавляем ТОЛЬКО комплектующую
    try {
      const taskInfo = await db.query(
        "SELECT t.device_name, t.id as task_id FROM assembly_tasks t JOIN task_items ti ON ti.task_id = t.id WHERE ti.id = $1", [itemId]
      );
      if (taskInfo.rows.length > 0) {
        const dn = taskInfo.rows[0].device_name;
        const existing = await db.query(
          "SELECT * FROM assembled_devices WHERE device_name = $1 AND component_name = $2 AND component_type = 'component'",
          [dn, data.subtask_name]
        );
        if (existing.rows.length > 0) {
          await db.query("UPDATE assembled_devices SET quantity = quantity + 1 WHERE id = $1", [existing.rows[0].id]);
        } else {
          await db.query(
            "INSERT INTO assembled_devices (device_name, component_name, component_type, quantity, assembled_by, assembled_from_task_id) VALUES ($1,$2,'component',1,$3,$4)",
            [dn, data.subtask_name, completed_login, taskInfo.rows[0].task_id]
          );
        }
      }
    } catch (e) { console.log("Assemble error:", e.message); }

    await db.query("UPDATE task_items SET status='completed', completed_at=NOW(), completed_by=$1 WHERE id=$2", [completed_by, itemId]);
    await db.query("DELETE FROM notifications WHERE task_item_id = $1", [itemId]);

    // Проверяем ВСЕ подзадачи
    const allItems = await db.query("SELECT * FROM task_items WHERE task_id = $1", [data.task_id]);
    const allCompleted = allItems.rows.every(ti => ti.status === 'completed');
    
    // Только если ВСЕ подзадачи выполнены — добавляем прибор
    if (allCompleted) {
      await db.query("UPDATE assembly_tasks SET status='completed', completed_at=NOW() WHERE id=$1", [data.task_id]);
      try {
        const ti = await db.query("SELECT device_name FROM assembly_tasks WHERE id = $1", [data.task_id]);
        if (ti.rows.length > 0) {
          const dn = ti.rows[0].device_name;
          const ex = await db.query("SELECT * FROM assembled_devices WHERE device_name = $1 AND component_type = 'device'", [dn]);
          if (ex.rows.length > 0) {
            await db.query("UPDATE assembled_devices SET quantity = quantity + 1 WHERE id = $1", [ex.rows[0].id]);
          } else {
            await db.query("INSERT INTO assembled_devices (device_name, component_type, quantity, assembled_by, assembled_from_task_id) VALUES ($1,'device',1,$2,$3)", [dn, completed_login, data.task_id]);
          }
        }
      } catch (e) { console.log("Device assemble error:", e.message); }
    }
    console.log("=== COMPLETE ===");
    console.log("Subtask:", data.subtask_name);
    console.log("Task ID:", data.task_id);
    console.log("All items:", allItems.rows.map(ti => ({ id: ti.id, name: ti.subtask_name, status: ti.status })));
    console.log("All completed:", allCompleted);

    res.json({ message: "Выполнено", all_completed: allCompleted });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/items/:id/add-time", async (req, res) => {
  try {
    const { added_minutes, admin_login, user_id } = req.body;
    const item = await db.query("SELECT * FROM task_items WHERE id = $1", [req.params.id]);
    if (item.rows.length === 0) return res.status(404).json({ error: "Не найдена" });
    const data = item.rows[0];
    const task = await db.query("SELECT * FROM assembly_tasks WHERE id = $1", [data.task_id]);
    const isSuperAdmin = (admin_login || '').toLowerCase() === SUPER_ADMIN.toLowerCase();
    if (!isSuperAdmin && task.rows[0].created_by !== user_id) return res.status(403).json({ error: "Только создатель" });
    const newTime = (data.time_estimate || 0) + (added_minutes || 0);
    const newDeadline = data.deadline ? extendDeadline(new Date(data.deadline), added_minutes || 0) : calculateWorkingDeadline(new Date(), added_minutes || 0);
    await db.query("UPDATE task_items SET time_estimate=$1, deadline=$2 WHERE id=$3", [newTime, newDeadline, req.params.id]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${admin_login || 'Система'}] Добавил ${added_minutes} мин к подзадаче "${data.subtask_name}"`]);
    res.json({ ok: true, new_deadline: newDeadline });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/items/:id/reassign", async (req, res) => {
  try {
    const { assigned_to, assigned_login, user_login } = req.body;
    const item = await db.query("SELECT * FROM task_items WHERE id = $1", [req.params.id]);
    if (item.rows.length === 0) return res.status(404).json({ error: "Не найдена" });
    await db.query("UPDATE task_items SET assigned_to=$1, assigned_login=$2 WHERE id=$3", [assigned_to, assigned_login, req.params.id]);
    await db.query("INSERT INTO notifications (user_id, user_login, message, task_id, task_item_id, notification_type) VALUES ($1,$2,$3,$4,$5,'task')",
      [assigned_to, assigned_login, `📋 Переназначена "${item.rows[0].subtask_name}"`, item.rows[0].task_id, req.params.id]);
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Переназначил "${item.rows[0].subtask_name}" на ${assigned_login}`]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/items/:id/request-time", async (req, res) => {
  try {
    const { requested_minutes, user_id, user_login } = req.body;
    const item = await db.query("SELECT * FROM task_items WHERE id = $1", [req.params.id]);
    if (item.rows.length === 0) return res.status(404).json({ error: "Не найдена" });
    if (item.rows[0].assigned_to !== user_id) return res.status(403).json({ error: "Только исполнитель" });
    const task = await db.query("SELECT * FROM assembly_tasks WHERE id = $1", [item.rows[0].task_id]);
    if (task.rows.length > 0 && task.rows[0].created_by) {
      await db.query("INSERT INTO notifications (user_id, user_login, message, task_id, task_item_id, notification_type) VALUES ($1,$2,$3,$4,$5,'task')",
        [task.rows[0].created_by, task.rows[0].created_by_login, `⏰ ${user_login} запрашивает +${requested_minutes} мин для "${item.rows[0].subtask_name}"`, item.rows[0].task_id, req.params.id]);
    }
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login}] Запросил +${requested_minutes} мин для "${item.rows[0].subtask_name}"`]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { user_id, user_login } = req.body;

    const task = await db.query("SELECT * FROM assembly_tasks WHERE id = $1", [taskId]);
    if (task.rows.length === 0) return res.status(404).json({ error: "Не найдена" });

    const isSuperAdmin = (user_login || '').toLowerCase() === SUPER_ADMIN.toLowerCase();
    if (!isSuperAdmin && task.rows[0].created_by !== user_id) {
      return res.status(403).json({ error: "Только создатель задачи может удалить её" });
    }

    // Возвращаем компоненты на склад если нет назначенных
    const assignedCount = await db.query(
      "SELECT COUNT(*) as count FROM task_items WHERE task_id = $1 AND assigned_to IS NOT NULL", [taskId]
    );

    if (parseInt(assignedCount.rows[0].count) === 0) {
      const comps = await db.query(
        "SELECT sc.item_type, sc.component_id, sc.quantity FROM subtask_components sc JOIN task_items ti ON ti.id = sc.task_item_id WHERE ti.task_id = $1",
        [taskId]
      );
      for (const c of comps.rows) {
        const qty = parseInt(c.quantity) || 0;
        if (c.item_type === 'item' && c.component_id) {
          await db.query("UPDATE items SET quantity = quantity + $1 WHERE id = $2", [qty, c.component_id]);
        } else if (c.item_type === 'consumable' && c.component_id) {
          await db.query("UPDATE consumables SET quantity = quantity + $1 WHERE id = $2", [qty, c.component_id]);
        }
      }
    }

    // Удаляем в правильном порядке
    try { await db.query("DELETE FROM subtask_components WHERE task_item_id IN (SELECT id FROM task_items WHERE task_id = $1)", [taskId]); } catch (e) {}
    try { await db.query("DELETE FROM task_items WHERE task_id = $1", [taskId]); } catch (e) {}
    try { await db.query("DELETE FROM notifications WHERE task_id = $1", [taskId]); } catch (e) {}
    await db.query("DELETE FROM assembly_tasks WHERE id = $1", [taskId]);

    await db.query("INSERT INTO logs(action) VALUES($1)",
      [`[${user_login || 'Система'}] 🗑 Удалил задачу #${taskId} "${task.rows[0].device_name}"`]);

    res.json({ message: parseInt(assignedCount.rows[0].count) === 0 ? "Удалена, компоненты возвращены" : "Удалена" });
  } catch (e) {
    console.error("Delete task error:", e);
    res.status(500).json({ error: e.message });
  }
});
router.get("/my-tasks/:userId", async (req, res) => {
  try {
    const tasks = await db.query(
      `SELECT ti.*, t.device_name, t.status as task_status,
        COALESCE((SELECT json_agg(json_build_object('id',sc.id,'component_name',sc.component_name,'quantity',sc.quantity,'unit',sc.unit,'item_type',sc.item_type)) FROM subtask_components sc WHERE sc.task_item_id = ti.id), '[]'::json) as components
      FROM task_items ti JOIN assembly_tasks t ON t.id = ti.task_id 
      WHERE ti.assigned_to = $1 AND ti.status != 'completed' ORDER BY ti.deadline ASC NULLS LAST`,
      [req.params.userId]
    );
    res.json(tasks.rows);
  } catch (e) { res.json([]); }
});

// Рутинные
router.get("/routine", async (req, res) => {
  try { const r = await db.query("SELECT * FROM routine_tasks ORDER BY created_at DESC"); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/routine", async (req, res) => {
  try {
    const { name, description, time_estimate, created_by, created_by_login, assigned_to, assigned_login, status } = req.body;
    const em = time_estimate || 60;
    const deadline = assigned_to ? calculateWorkingDeadline(new Date(), em) : null;
    const st = assigned_to ? 'in_progress' : (status || 'pending');
    const result = await db.query(
      "INSERT INTO routine_tasks (name, description, time_estimate, deadline, created_by, created_by_login, assigned_to, assigned_login, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
      [name, description, em, deadline, created_by, created_by_login, assigned_to || null, assigned_login || null, st]
    );
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${created_by_login || 'Система'}] Создал рутинную задачу: "${name}"`]);
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/routine/:id", async (req, res) => {
  try {
    const { name, description, time_estimate, assigned_to, assigned_login, status, user_login } = req.body;
    const em = time_estimate || 60;
    const deadline = assigned_to ? calculateWorkingDeadline(new Date(), em) : null;
    const result = await db.query(
      "UPDATE routine_tasks SET name=$1, description=$2, time_estimate=$3, deadline=$4, assigned_to=$5, assigned_login=$6, status=$7 WHERE id=$8 RETURNING *",
      [name, description, em, deadline, assigned_to, assigned_login, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Не найдена" });
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Обновил рутинную задачу #${req.params.id}`]);
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/routine/:id/complete", async (req, res) => {
  try {
    const { completed_by, completed_login } = req.body;
    const result = await db.query("UPDATE routine_tasks SET status='completed', completed_at=NOW(), completed_by=$1 WHERE id=$2 RETURNING *", [completed_by, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Не найдена" });
    await db.query("INSERT INTO logs(action) VALUES($1)", [`[${completed_login}] ✅ Выполнил рутинную задачу: "${result.rows[0].name}"`]);
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/routine/:id", async (req, res) => {
  try {
    const { user_login } = req.body;
    const t = await db.query("SELECT name FROM routine_tasks WHERE id=$1", [req.params.id]);
    await db.query("DELETE FROM routine_tasks WHERE id=$1", [req.params.id]);
    if (t.rows.length > 0) await db.query("INSERT INTO logs(action) VALUES($1)", [`[${user_login || 'Система'}] Удалил рутинную задачу: "${t.rows[0].name}"`]);
    res.json({ message: "Удалена" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/notifications/count/:userId", async (req, res) => {
  try { const r = await db.query("SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false AND notification_type = 'task'", [req.params.userId]); res.json({ count: parseInt(r.rows[0].count) }); } catch (e) { res.json({ count: 0 }); }
});

router.get("/notifications/:userId", async (req, res) => {
  try { const r = await db.query("SELECT * FROM notifications WHERE user_id = $1 AND is_read = false AND notification_type = 'task' ORDER BY created_at DESC LIMIT 20", [req.params.userId]); res.json(r.rows); } catch (e) { res.json([]); }
});

router.put("/notifications/:id/read", async (req, res) => {
  try { await db.query("UPDATE notifications SET is_read = true WHERE id = $1", [req.params.id]); res.sendStatus(200); } catch (e) { res.sendStatus(200); }
});

router.get("/gantt-data", async (req, res) => {
  try {
    const a = await db.query("SELECT t.id, t.device_name as name, t.status, t.created_at, t.completed_at, 'assembly' as task_type, MIN(ti.deadline) as start_date, MAX(ti.deadline) as end_date FROM assembly_tasks t LEFT JOIN task_items ti ON ti.task_id = t.id WHERE t.status = 'completed' GROUP BY t.id ORDER BY t.created_at DESC");
    const r = await db.query("SELECT id, name, status, created_at, completed_at, 'routine' as task_type, created_at as start_date, deadline as end_date FROM routine_tasks WHERE status = 'completed' ORDER BY created_at DESC");
    res.json([...a.rows, ...r.rows]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
