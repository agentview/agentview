import { redirect, type RouteObject } from "react-router";

async function loader() {
  console.log('LOGOUT!!!!!');
  localStorage.removeItem("agentview_token");
  return redirect('/');
}

export const logoutRoute : RouteObject = {
  loader
}