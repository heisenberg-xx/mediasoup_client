import { Toaster } from "react-hot-toast";
import { Outlet } from "react-router";
import Header from "./component/Header";

const App = () => {
  return (
    <main className="bg-secondary min-h-screen flex flex-col w-screen   poppins-regular px-5">
      <Header />
      <div className="w-full flex items-center justify-center">
        <Outlet />
      </div>
      <Toaster />
    </main>
  );
};
export default App;
