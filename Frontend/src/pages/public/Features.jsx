import { motion } from 'framer-motion';
import { Star, Check, ThumbsUp } from 'lucide-react';
import AttendanceChart from '../../components/landing/AttendanceChart';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const reviews = [
  { meal: 'Taco Tuesday', review: 'Best tacos on campus!', rating: 5 },
  { meal: 'Steak Night', review: 'A little overcooked, but still good.', rating: 4 },
  { meal: 'Pasta Bar', review: 'Loved the variety of sauces.', rating: 5 },
  { meal: 'Fish Friday', review: 'Surprisingly delicious!', rating: 4 },
  { meal: 'Burger Bonanza', review: 'The classic, perfected.', rating: 5 },
];

const duplicatedReviews = [...reviews, ...reviews];

const FeatureSection = ({ icon: Icon, title, description, children }) => (
    <div className="py-20 sm:py-32">
    <div className="mx-auto max-w-7xl px-6 lg:px-8">
      <div className="mx-auto max-w-3xl lg:text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, amount: 0.8 }}
        >
          <div className="flex items-center justify-center gap-x-3">
            <Icon className="h-8 w-8 text-primary" />
            <h2 id="features" className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              {title}
            </h2>
          </div>
          <p className="mt-6 text-lg leading-8 text-text-secondary">
            {description}
          </p>
        </motion.div>
      </div>
      <div className="mt-16">{children}</div>
    </div>
  </div>
);

export default function FeaturesPage() {
  const location = useLocation();
  const reviewsRef = useRef(null);
  const recommendationsRef = useRef(null);
  const attendanceRef = useRef(null);

  useEffect(() => {
    if (location.hash) {
      let ref;
      if (location.hash === '#reviews') {
        ref = reviewsRef;
      } else if (location.hash === '#recommendations') {
        ref = recommendationsRef;
      } else if (location.hash === '#attendance') {
        ref = attendanceRef;
      }

      if (ref && ref.current) {
        setTimeout(() => {
          ref.current.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location]);

  return (
    <>
      <div id="reviews" ref={reviewsRef}>
        <FeatureSection
          icon={Star}
          title="Meal Reviews"
          description="Members can rate and review meals, so you know what's a hit and what's a miss."
        >
          <div className="w-full overflow-hidden">
            <motion.div
              className="flex space-x-8"
              animate={{
                x: ['0%', `-${100 * (reviews.length / (reviews.length + 0.5))}%`],
                transition: {
                  ease: 'linear',
                  duration: 30,
                  repeat: Infinity,
                },
              }}
            >
              {duplicatedReviews.map((item, index) => (
                <div key={index} className="flex-shrink-0 w-80 rounded-xl bg-white p-8 shadow-lg">
                  <div className="flex items-center">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="mt-4 text-xl font-semibold text-text-primary">{item.meal}</p>
                  <p className="mt-2 text-md text-text-secondary">"{item.review}"</p>
                </div>
              ))}
            </motion.div>
          </div>
        </FeatureSection>
      </div>

      <div id="recommendations" ref={recommendationsRef}>
        <FeatureSection
          icon={ThumbsUp}
          title="Recommendations"
          description="Have a great idea for a meal? Let the kitchen know! Members can submit meal recommendations directly through the app."
        >
          <motion.div
            className="rounded-xl bg-white p-8 w-full max-w-md mx-auto shadow-lg"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, amount: 0.8 }}
          >
            <p className="text-text-primary font-semibold text-2xl">Recommend a Meal</p>
            <input
              type="text"
              placeholder="e.g., Sushi Night"
              className="mt-6 w-full rounded-lg border-border-light bg-light-bg-start px-4 py-3 text-text-primary text-lg"
            />
            <button className="mt-4 w-full rounded-lg bg-primary px-4 py-3 text-white text-lg font-semibold">
              Submit
            </button>
          </motion.div>
        </FeatureSection>
      </div>

      <div id="attendance" ref={attendanceRef}>
        <FeatureSection
          icon={Check}
          title="Attendance"
          description="Get an accurate headcount for every meal and see how attendance trends over time."
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl mx-auto">
            <motion.div
              className="rounded-xl bg-white p-8 shadow-lg"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true, amount: 0.8 }}
            >
              <p className="text-text-primary font-semibold text-2xl">Dinner Attendance</p>
              <ul className="mt-6 space-y-4">
                <li className="flex items-center justify-between text-text-primary text-lg">
                  <span>John S.</span>
                  <Check className="h-6 w-6 text-green-400" />
                </li>
                <li className="flex items-center justify-between text-text-primary text-lg">
                  <span>Mike L.</span>
                  <Check className="h-6 w-6 text-green-400" />
                </li>
                <li className="flex items-center justify-between text-text-secondary text-lg">
                  <span>Chris P.</span>
                  <span className="text-sm">Not Attending</span>
                </li>
              </ul>
            </motion.div>
            <motion.div
              className="rounded-xl bg-white p-8 shadow-lg"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true, amount: 0.8 }}
            >
              <p className="text-text-primary font-semibold text-2xl">Predicted vs. Actual</p>
              <div className="mt-4">
                <AttendanceChart />
              </div>
            </motion.div>
          </div>
        </FeatureSection>
      </div>
    </>
  );
}
