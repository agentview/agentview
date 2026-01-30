import { redirect, type RouteObject } from "react-router";

function loader() {
  return redirect('/sessions');
}

function Component() {
  return <div className="flex flex-col items-center justify-center h-screen">
    <h1 className="text-2xl font-semibold">Hello World</h1>
  </div>
}

export const homeRoute: RouteObject = {
  Component,
  loader
}
