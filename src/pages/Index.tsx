import { Authenticated, Unauthenticated } from "convex/react";
import WelcomePage from "./_components/WelcomePage.tsx";
import Dashboard from "./_components/Dashboard.tsx";

export default function Index() {
  return (
    <>
      <Unauthenticated>
        <WelcomePage />
      </Unauthenticated>
      <Authenticated>
        <Dashboard />
      </Authenticated>
    </>
  );
}
