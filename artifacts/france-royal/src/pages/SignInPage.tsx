import { SignIn } from "@clerk/react";
import GuestButton from "../components/GuestButton";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 px-4 py-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="flex flex-col items-center">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
        <GuestButton />
      </div>
    </div>
  );
}
