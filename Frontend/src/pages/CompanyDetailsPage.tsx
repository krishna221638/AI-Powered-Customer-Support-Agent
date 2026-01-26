import { FC } from "react";
import {
  Users,
  BarChart,
  Award,
  BookOpen,
  Globe2,
  CalendarClock,
} from "lucide-react";

const CompanyDetailsPage: FC = () => {
  return (
    <div className="w-full">
      {/* Header Section */}
      <section className="bg-blue-600 dark:bg-blue-800 text-white py-16 px-4 transition-colors duration-300">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            About Our Company
          </h1>
          <p className="text-xl text-blue-100 dark:text-blue-200 mb-8 max-w-3xl">
            Leading the way in AI-powered customer support innovation since
            2020.
          </p>
        </div>
      </section>

      {/* Company Story */}
      <section className="py-16 px-4 bg-white dark:bg-gray-900 transition-colors duration-300">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-12">
            <div className="md:w-1/2">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                Our Story
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Founded by a team of AI researchers and customer support
                veterans, our company was born from the recognition that
                traditional support systems were failing to keep pace with
                customer expectations.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We set out to build an intelligent system that could understand
                the nuance of customer inquiries, route them efficiently, and
                provide agents with the context they need to deliver exceptional
                service.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Today, our platform processes millions of support tickets
                monthly for companies of all sizes, from startups to Fortune 500
                enterprises.
              </p>
            </div>
            <div className="md:w-1/2 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center p-6 transition-colors duration-300">
              <div className="text-center">
                <CalendarClock className="h-16 w-16 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  Company Timeline
                </h3>
                <ul className="text-left text-gray-700 dark:text-gray-300 space-y-2">
                  <li className="flex items-start">
                    <span className="font-semibold min-w-24 inline-block">
                      2020:
                    </span>
                    <span>Company founded</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold min-w-24 inline-block">
                      2021:
                    </span>
                    <span>First enterprise client</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold min-w-24 inline-block">
                      2022:
                    </span>
                    <span>Series A funding ($12M)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold min-w-24 inline-block">
                      2023:
                    </span>
                    <span>Expanded to Europe & Asia</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold min-w-24 inline-block">
                      2024:
                    </span>
                    <span>Series B funding ($45M)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Company Stats */}
      <section className="py-12 px-4 bg-gray-50 dark:bg-gray-800 transition-colors duration-300">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg shadow-lg border-2 border-blue-200 dark:border-blue-700 transition-colors duration-300">
              <p className="text-3xl font-bold">5M+</p>
              <p className="">Tickets Processed Monthly</p>
            </div>
            <div className="text-center p-4 bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200 rounded-lg shadow-lg border-2 border-pink-200 dark:border-pink-700 transition-colors duration-300">
              <p className="text-3xl font-bold">500+</p>
              <p className="">Enterprise Clients</p>
            </div>
            <div className="text-center p-4 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-lg shadow-lg border-2 border-purple-200 dark:border-purple-700 transition-colors duration-300">
              <p className="text-3xl font-bold">99.9%</p>
              <p className="">System Uptime</p>
            </div>
            <div className="text-center p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-lg shadow-lg border-2 border-green-200 dark:border-green-700 transition-colors duration-300">
              <p className="text-3xl font-bold">40+</p>
              <p className="">Countries Served</p>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="py-16 px-4 bg-white dark:bg-gray-900 transition-colors duration-300">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center text-gray-900 dark:text-gray-100">
            Our Leadership Team
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-32 h-32 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg border-2 border-blue-200 dark:border-blue-600 transition-colors duration-300">
                <Users className="h-16 w-16" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Alex Morgan
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                CEO & Co-Founder
              </p>
            </div>
            <div className="text-center">
              <div className="w-32 h-32 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg border-2 border-purple-200 dark:border-purple-600 transition-colors duration-300">
                <BarChart className="h-16 w-16" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Dr. Sarah Chen
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                CTO & Co-Founder
              </p>
            </div>
            <div className="text-center">
              <div className="w-32 h-32 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg border-2 border-green-200 dark:border-green-600 transition-colors duration-300">
                <Globe2 className="h-16 w-16" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Michael Thompson
              </h3>
              <p className="text-gray-600 dark:text-gray-400">COO</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-800 transition-colors duration-300">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center text-gray-900 dark:text-gray-100">
            Our Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-6 rounded-lg shadow-lg border-2 border-yellow-200 dark:border-yellow-600 transition-colors duration-300">
              <Award className="h-10 w-10 text-yellow-600 dark:text-yellow-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Excellence in AI</h3>
              <p>
                We're committed to pushing the boundaries of what's possible
                with artificial intelligence in customer support.
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-6 rounded-lg shadow-lg border-2 border-blue-200 dark:border-blue-600 transition-colors duration-300">
              <BookOpen className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Continuous Learning
              </h3>
              <p>
                Our systems and our team are always learning, adapting, and
                improving based on new data and feedback.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CompanyDetailsPage;
