import { Outlet } from "react-router-dom";
import { Nav } from "./Nav";

/** UC-010 BR-002: the nav shell always renders around the routed content (including the error
 * view itself), so a failed navigation/request never stands the user on a bare, chrome-less
 * page. */
export function MainLayout() {
  return (
    <>
      <Nav />
      <Outlet />
    </>
  );
}
