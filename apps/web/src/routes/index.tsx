/**
 * Trang chủ (Landing Page) cho VN Speech Guardian
 * - Hero section với giới thiệu sản phẩm
 * - Feature highlights và benefits
 * - Call-to-action buttons dẫn đến dashboard hoặc live processing
 * - Responsive design với TailwindCSS
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Shield, Mic, BarChart3, Zap, Languages, Lock } from 'lucide-react'

// Component cho feature cards
function FeatureCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string 
}) {
  return (
    <div className="group relative p-6 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 hover:border-primary/20">
      <div className="flex items-center space-x-4 mb-4">
        <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}

// Component cho statistics
function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-primary mb-2">{number}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  )
}

// Landing page component
function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <Shield className="w-4 h-4 mr-2" />
              Bảo vệ nội dung tiếng Việt với AI
            </div>

            {/* Heading */}
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              <span className="text-primary">VN Speech Guardian</span>
              <br />
              AI phát hiện nội dung độc hại
            </h1>

            {/* Description */}
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Ứng dụng Speech-to-Text và phát hiện nội dung độc hại real-time cho tiếng Việt. 
              Bảo vệ cộng đồng khỏi hate speech với độ chính xác cao và xử lý offline.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                to="/live"
                className="group inline-flex items-center px-8 py-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <Mic className="w-5 h-5 mr-3" />
                Bắt đầu Live Processing
                <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                to="/dashboard"
                className="inline-flex items-center px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-primary hover:text-primary transition-all duration-300"
              >
                <BarChart3 className="w-5 h-5 mr-3" />
                Xem Dashboard
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
              <StatCard number="99.2%" label="Độ chính xác" />
              <StatCard number="<100ms" label="Độ trễ" />
              <StatCard number="100%" label="Offline" />
              <StatCard number="24/7" label="Hoạt động" />
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-primary/20 to-indigo-200 blur-3xl opacity-70"></div>
          <div className="absolute -bottom-40 -left-32 w-80 h-80 rounded-full bg-gradient-to-tr from-blue-200 to-primary/20 blur-3xl opacity-70"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              Tính năng nổi bật
            </h2>
            <p className="text-lg text-gray-600">
              Được thiết kế đặc biệt cho tiếng Việt với các tính năng tiên tiến
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Zap}
              title="Real-time Processing"
              description="Xử lý audio real-time với độ trễ thấp, phát hiện nội dung độc hại ngay lập tức trong quá trình nói chuyện."
            />
            
            <FeatureCard
              icon={Languages}
              title="Tiếng Việt tối ưu"
              description="Được training đặc biệt cho tiếng Việt với PhoBERT và dataset ViHSD để đạt độ chính xác cao nhất."
            />
            
            <FeatureCard
              icon={Lock}
              title="Hoạt động Offline"
              description="Toàn bộ xử lý diễn ra offline, bảo đảm riêng tư và không phụ thuộc vào kết nối internet."
            />
            
            <FeatureCard
              icon={Shield}
              title="Phân loại đa cấp"
              description="Phân loại nội dung theo nhiều mức độ: CLEAN, OFFENSIVE, HATE với confidence score chi tiết."
            />
            
            <FeatureCard
              icon={BarChart3}
              title="Analytics mạnh mẽ"
              description="Dashboard phân tích chi tiết với biểu đồ, thống kê và báo cáo để theo dõi hiệu quả."
            />
            
            <FeatureCard
              icon={Mic}
              title="Audio chất lượng cao"
              description="Hỗ trợ nhiều định dạng audio, Voice Activity Detection và noise reduction tự động."
            />
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Sẵn sàng bảo vệ cộng đồng của bạn?
          </h2>
          <p className="text-xl opacity-90 mb-10 max-w-2xl mx-auto">
            Bắt đầu sử dụng VN Speech Guardian ngay hôm nay và trải nghiệm 
            công nghệ AI tiên tiến cho tiếng Việt.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/login"
              className="inline-flex items-center px-8 py-4 bg-white text-primary font-semibold rounded-lg hover:bg-gray-50 transition-all duration-300"
            >
              Đăng nhập ngay
              <ArrowRight className="w-5 h-5 ml-3" />
            </Link>
            
            <Link 
              to="/live"
              className="inline-flex items-center px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-300"
            >
              <Mic className="w-5 h-5 mr-3" />
              Demo trực tiếp
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

// Export route definition với type safety
export const Route = createFileRoute('/')({
  component: LandingPage,
})