import { FC } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  HeartHandshake,
  BrainCircuit,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";

const FeatureCard: FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}> = ({ icon, title, description, gradient }) => {
  return (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-600 to-accent-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur"></div>
      <div className="relative card-hover p-8 h-full">
        <div
          className={`w-12 h-12 rounded-xl ${gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
        >
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};

const StatCard: FC<{
  number: string;
  label: string;
  suffix?: string;
}> = ({ number, label, suffix = "" }) => {
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">
        {number}
        {suffix}
      </div>
      <div className="text-gray-600 dark:text-gray-400 font-medium">
        {label}
      </div>
    </div>
  );
};

const HomePage: FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const handleGetStartedClick = () => {
    if (
      isAuthenticated &&
      (user?.role === "admin" || user?.role === "superAdmin")
    ) {
      navigate("/admin/documentation");
    } else {
      navigate("/signup");
    }
  };

  return (
    <div className="flex flex-col w-full bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary-600/20 to-accent-600/20 rounded-full blur-3xl"></div>

        <div className="relative py-20 sm:py-24 md:py-32 px-4">
          <div className="max-w-6xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-8 animate-slide-down">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Support Revolution
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight animate-slide-up">
              <span className="text-gray-900 dark:text-gray-100">
                AI‑Powered
              </span>
              <br />
              <span className="text-gradient">Support Triage</span>
              <br />
              <span className="text-gray-900 dark:text-gray-100">Agent</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl sm:text-2xl md:text-3xl mb-12 text-gray-600 dark:text-gray-400 max-w-4xl mx-auto leading-relaxed animate-slide-up animation-delay-100">
              Automate ticket routing, sentiment detection, and department
              assignment with cutting-edge AI technology.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 px-4 animate-slide-up animation-delay-200">
              <button
                onClick={handleGetStartedClick}
                className="group relative btn-primary px-8 py-4 text-lg font-semibold shadow-glow hover:shadow-large"
              >
                <span className="relative z-10 flex items-center">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
                </span>
              </button>
              <button
                onClick={() => navigate("/product")}
                className="btn-secondary px-8 py-4 text-lg font-semibold"
              >
                Learn More
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 animate-slide-up animation-delay-300">
              <StatCard number="99.9" label="Uptime" suffix="%" />
              <StatCard number="5M" label="Tickets Processed" suffix="+" />
              <StatCard number="500" label="Enterprise Clients" suffix="+" />
              <StatCard number="40" label="Countries Served" suffix="+" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-24 md:py-32 px-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Powerful AI Features
            </h2>
            <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Our intelligent system processes support tickets with advanced AI
              to improve response times and customer satisfaction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            <FeatureCard
              icon={<Bot className="w-6 h-6 text-white" />}
              title="Auto Categorization"
              description="AI analyzes ticket content to automatically categorize and route to the right department, saving time and reducing errors."
              gradient="bg-gradient-to-r from-blue-500 to-blue-600"
            />
            <FeatureCard
              icon={<HeartHandshake className="w-6 h-6 text-white" />}
              title="Sentiment Detection"
              description="Detect customer sentiment to prioritize urgent or negative experiences and improve customer satisfaction."
              gradient="bg-gradient-to-r from-pink-500 to-rose-600"
            />
            <FeatureCard
              icon={<BrainCircuit className="w-6 h-6 text-white" />}
              title="Smart Escalation"
              description="Intelligent escalation paths ensure critical issues reach the right team members at the right time."
              gradient="bg-gradient-to-r from-purple-500 to-purple-600"
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-white" />}
              title="Lightning Fast"
              description="Process thousands of tickets per second with sub-millisecond response times for real-time support."
              gradient="bg-gradient-to-r from-yellow-500 to-orange-600"
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6 text-white" />}
              title="Enterprise Security"
              description="Bank-grade security with SOC 2 compliance, end-to-end encryption, and advanced threat protection."
              gradient="bg-gradient-to-r from-green-500 to-emerald-600"
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6 text-white" />}
              title="AI Insights"
              description="Advanced analytics and machine learning insights to optimize your support operations continuously."
              gradient="bg-gradient-to-r from-indigo-500 to-purple-600"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 sm:py-24 md:py-32 px-4 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-accent-600"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>

        <div className="relative max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Ready to transform your support workflow?
          </h2>
          <p className="text-xl sm:text-2xl mb-10 opacity-90 leading-relaxed">
            Join innovative companies already using our AI platform to improve
            support efficiency and customer satisfaction.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
            <button
              onClick={() => navigate("/signup")}
              className="group bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 rounded-xl font-semibold text-lg shadow-large hover:shadow-glow transition-all duration-200"
            >
              <span className="flex items-center justify-center">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
              </span>
            </button>
            <button
              onClick={() => navigate("/company")}
              className="border-2 border-white text-white hover:bg-white hover:text-primary-600 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200"
            >
              Learn About Us
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
