import { motion } from "framer-motion";
import { Scissors, Star, Clock, Shield } from "lucide-react";

const features = [
  {
    icon: Scissors,
    title: "Expert Stylists",
    description: "Certified professionals with years of experience in premium salon services.",
  },
  {
    icon: Star,
    title: "Luxury Experience",
    description: "Every visit is crafted to make you feel pampered, valued, and beautiful.",
  },
  {
    icon: Clock,
    title: "Easy Booking",
    description: "Book your appointment in seconds. No calls, no waiting - just a few taps.",
  },
  {
    icon: Shield,
    title: "Trusted & Safe",
    description: "Hygiene-first approach with premium products and sanitised equipment.",
  },
];

const Home = () => {
  return (
    <div className="overflow-hidden">
      <section className="relative min-h-screen flex items-center justify-center px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-gold/5 blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-rose-light/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-gold/5" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-xs font-medium tracking-[0.2em] uppercase text-gold border border-gold/20 rounded-full bg-gold/5">
              Premium Salon Experience
            </span>
          </motion.div>

          <motion.h1
            className="font-display text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-charcoal mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 0.61, 0.36, 1] }}
          >
            Where Beauty
            <br />
            <span className="text-gradient-gold">Meets Elegance</span>
          </motion.h1>

          <motion.p
            className="text-charcoal-muted text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
          >
            Indulge in a world-class salon experience. Book your appointment,
            track your services, and let us take care of the rest.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <button className="luxury-gradient text-white px-8 py-3.5 rounded-lg font-medium text-sm tracking-wide hover:opacity-90 transition-opacity shadow-gold">
              Book Appointment
            </button>
            <button className="bg-white text-charcoal px-8 py-3.5 rounded-lg font-medium text-sm tracking-wide border border-charcoal/10 hover:border-gold/30 transition-colors shadow-soft">
              Explore Services
            </button>
          </motion.div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="text-gold text-sm font-medium tracking-[0.15em] uppercase">
              Why Choose Us
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold mt-3">
              A Cut Above the Rest
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  className="glass-card rounded-xl p-7 hover:shadow-card transition-shadow duration-500 group"
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.6,
                    delay: index * 0.1,
                    ease: [0.22, 0.61, 0.36, 1],
                  }}
                >
                  <div className="w-11 h-11 rounded-lg bg-gold/10 flex items-center justify-center mb-5 group-hover:bg-gold/15 transition-colors">
                    <Icon className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-charcoal-muted text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="py-8 border-t border-gold/10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="font-display text-lg font-semibold text-charcoal">
            Glamour<span className="text-gold">.</span>
          </p>
          <p className="text-xs text-charcoal-muted">
            Copyright {new Date().getFullYear()} Glamour Salon. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
