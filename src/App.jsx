import { Outlet } from "react-router";

const App = () => {
  return (
    <main className="bg-[#353535] min-h-screen flex w-screen  justify-center items-center poppins-regular">
      <Outlet />
    </main>
  );
};
export default App;
