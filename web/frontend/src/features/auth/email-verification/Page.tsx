import VerifyEmailContainer from "@/features/auth/email-verification/components/VerifyEmailContainer";
import RegisterBrandSection from "@/features/auth/register/components/RegisterBrandSection";

function Page() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-[url('/assets/images/bg.jpg')] bg-center bg-repeat-y md:bg-cover md:bg-no-repeat p-8 sm:px-10 md:p-15 md:px-20">
      <div className="flex w-full flex-col items-center justify-between gap-10 xl:flex-row">
        <RegisterBrandSection />
        <VerifyEmailContainer />
      </div>
    </div>
  );
}

export default Page;
