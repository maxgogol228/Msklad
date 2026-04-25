
export function getUser(){
  let user = localStorage.getItem("username");
  if(!user){
    user = prompt("Введите ваше имя");
    localStorage.setItem("username", user);
  }
  return user;
}
