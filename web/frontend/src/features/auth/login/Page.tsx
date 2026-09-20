import { useNavigate } from "react-router-dom";
import LoginBrandSection from "@/features/auth/login/components/LoginBrandSection";
import LoginContainer from "@/features/auth/login/components/LoginContainer";
import ProceedToOpacButton from "@/components/ui/ProceedToOpacButton";

function Page() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-[url('/assets/images/bg.jpg')] bg-center bg-repeat-y md:bg-cover md:bg-no-repeat p-8 sm:px-10 md:p-15 md:px-20">
      <div className="flex w-full flex-col items-center justify-between gap-10 xl:flex-row">
        <LoginBrandSection />
        <LoginContainer />
      </div>
      <ProceedToOpacButton onClick={() => navigate("/opac/home")} />
    </div>
  );
}

export default Page;
