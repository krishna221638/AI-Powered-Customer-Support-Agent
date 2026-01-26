import { FC } from "react";
import { Cpu, Clock, Zap, BarChart4, Shield, Infinity } from "lucide-react";

const ProductPage: FC = () => {
  return (
    <div className="w-full bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 text-white py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            AI Support Agent Platform
          </h1>
          <p className="text-xl text-primary-100 dark:text-primary-200 mb-8 max-w-3xl">
            Our comprehensive platform uses advanced machine learning to
            transform your support operations and deliver exceptional customer
            experiences.
          </p>
        </div>
      </section>

      {/* Product Features */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">
            Advanced Platform Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-soft hover:shadow-medium border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-300">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
                <Cpu className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                Natural Language Processing
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Understands customer inquiries using advanced NLP to extract
                intent and entities.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-soft hover:shadow-medium border border-gray-200 dark:border-gray-700 hover:border-accent-300 dark:hover:border-accent-700 transition-all duration-300">
              <div className="p-3 bg-accent-100 dark:bg-accent-900/30 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-accent-600 dark:text-accent-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                24/7 Automated Processing
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Process and categorize tickets around the clock without human
                intervention.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-soft hover:shadow-medium border border-gray-200 dark:border-gray-700 hover:border-yellow-300 dark:hover:border-yellow-700 transition-all duration-300">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                Instant Response Suggestions
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Generate contextually relevant response templates for common
                inquiries.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-soft hover:shadow-medium border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
                <BarChart4 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                Advanced Analytics
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Gain insights into support trends, sentiment patterns, and team
                performance.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-soft hover:shadow-medium border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-all duration-300">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                Enterprise-Grade Security
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Secure handling of customer data with SOC 2 and GDPR compliance.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-soft hover:shadow-medium border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl w-12 h-12 flex items-center justify-center mb-4">
                <Infinity className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                Seamless Integration
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Connect with your existing tools via APIs and webhooks for a
                unified workflow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section Placeholder */}
      <section className="py-16 px-4 bg-white dark:bg-gray-800 transition-colors duration-300">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            Flexible Pricing Options
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Choose the plan that fits your organization's needs and scale as you
            grow.
          </p>
          <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 p-4 rounded-lg inline-block transition-colors duration-300">
            Contact our sales team for detailed pricing information
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProductPage;
