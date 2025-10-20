import { Outlet } from "react-router";

const App = () => {
  return (
    <main className="bg-[#353535] min-h-screen flex w-screen  justify-center md:items-center poppins-regular px-5">
      <Outlet />
    </main>
  );
};
export default App;
