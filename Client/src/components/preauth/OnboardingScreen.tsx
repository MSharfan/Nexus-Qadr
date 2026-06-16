import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ShoppingBag, Shield, Truck } from "lucide-react";

const slides = [
  {
    icon: ShoppingBag,
    title: "Shop the Future",
    description:
      "Discover cutting-edge products from verified sellers worldwide",
    color: "#00B0FF",
  },
  {
    icon: Shield,
    title: "Secure Payments",
    description: "Shop with confidence using our secure payment gateway",
    color: "#0D47A1",
  },
  {
    icon: Truck,
    title: "Fast Delivery",
    description: "Get your orders delivered quickly to your doorstep",
    color: "#00B0FF",
  },
];

const OnboardingScreen: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = React.useState(0);

  const completeOnboarding = () => {
    localStorage.setItem("onboardingComplete", "true");
    navigate("/auth", { replace: true });
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((s) => s + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#0D47A1] via-[#1565C0] to-[#00B0FF] flex items-center justify-center z-50">
      <div className="max-w-md mx-auto px-6 text-center">
        {/* Skip */}
        <div className="flex justify-end mb-8">
          <button
            onClick={handleSkip}
            className="text-white/80 hover:text-white transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Icon */}
        <div className="relative mb-8 inline-block">
          <div className="w-32 h-32 mx-auto rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Icon className="w-16 h-16 text-white" />
          </div>
          <div className="absolute inset-0 w-32 h-32 mx-auto rounded-full bg-white opacity-20 blur-2xl" />
        </div>

        {/* Content */}
        <h2 className="text-3xl text-white mb-4">{slide.title}</h2>
        <p className="text-lg text-white/90 mb-12">
          {slide.description}
        </p>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? "w-8 bg-white"
                  : "w-2 bg-white/40"
              }`}
            />
          ))}
        </div>

        {/* Next */}
        <button
          onClick={handleNext}
          className="w-full bg-white text-[#0D47A1] py-4 rounded-xl flex items-center justify-center gap-2 hover:shadow-xl transition-all"
        >
          <span>
            {currentSlide < slides.length - 1 ? "Next" : "Get Started"}
          </span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default OnboardingScreen;
