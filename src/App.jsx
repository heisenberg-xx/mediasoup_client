import { Outlet } from "react-router";

const App = () => {
  return (
    <main className=" flex w-screen  justify-center">
      <Outlet />
    </main>
  );
};
export default App;
