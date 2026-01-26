import { FC } from "react";
import SignUpStepper from "../components/SignUpStepper";
import { Bot, Chrome } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SignUpPage: FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col transition-colors duration-300">
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-2 bg-accent-100 dark:bg-accent-900/30 rounded-full mb-4 transition-colors duration-300">
              <Bot className="h-8 w-8 text-primary-600 dark:text-accent-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Create your AI Support account
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Follow the steps below to set up your organization
            </p>
          </div>

          {/* Google Sign Up Option */}
          <div className="mb-8">
            <button
              type="button"
              className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
              onClick={() => {
                // Google OAuth integration would go here
                alert("Google Sign-Up integration would be implemented here");
              }}
            >
              <Chrome className="h-5 w-5 mr-3 text-blue-500" />
              Continue with Google
            </button>

            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                  Or create account manually
                </span>
              </div>
            </div>
          </div>

          <SignUpStepper />
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-8">
            By signing up, you agree to our{" "}
            <a
              href="#"
              className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
