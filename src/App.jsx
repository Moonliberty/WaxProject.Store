import React from "react";

const CONTACTS = {
  phoneText: "+380 96 101 27 21",
  phoneHref: "tel:+380961012721",
  emailText: "waxprojectstore@gmail.com",
  emailHref: "mailto:waxprojectstore@gmail.com",
  telegramUser: "WaxProject_Manager"
};

export default function App() {
  return (
    <div style={{background:"#000",color:"#fff",minHeight:"100vh",padding:40}}>
      <h1>WaxProject.Store</h1>
      <h2 style={{color:"#ff2d2d"}}>Only by request</h2>

      <button onClick={()=>window.location.href=CONTACTS.phoneHref}>📞 {CONTACTS.phoneText}</button><br/><br/>
      <button onClick={()=>window.location.href=CONTACTS.emailHref}>📧 {CONTACTS.emailText}</button><br/><br/>
      <button onClick={()=>window.open(`https://t.me/${CONTACTS.telegramUser}`,"_blank")}>💬 Telegram</button>
    </div>
  );
}
