import { Link } from 'react-router-dom';
import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import MealCard from '../MealCard'; // Import MealCard

export default function Hero() {
  const dummyMeals = [
    {
      id: 1,
      meal_date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(), // Tomorrow
      dish_name: 'Beef Wellington',
      description: 'Classic beef tenderloin baked in puff pastry with duxelles.',
      image_url: '/uploads/Beef Wellington.jpg',
      attendance_count: 15,
      is_attending: false,
    },
    {
      id: 2,
      meal_date: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(), // Day after tomorrow
      dish_name: 'Classic Burger',
      description: 'Juicy beef patty with fresh toppings on a toasted bun.',
      image_url: '/uploads/Burger.jpg',
      attendance_count: 10,
      is_attending: true,
    },
    {
      id: 3,
      meal_date: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString(),
      dish_name: 'Steamed Dumplings',
      description: 'Delicious handmade dumplings filled with savory meat and vegetables.',
      image_url: '/uploads/Dumplings.jpg',
      attendance_count: 20,
      is_attending: false,
    },
    {
      id: 4,
      meal_date: new Date(new Date().setDate(new Date().getDate() + 4)).toISOString(),
      dish_name: 'Homemade Pizza',
      description: 'Freshly baked pizza with your favorite toppings.',
      image_url: '/uploads/Homemade-Pizza_EXPS_FT23_376_EC_120123_3.jpg',
      attendance_count: 18,
      is_attending: true,
    },
    {
      id: 5,
      meal_date: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
      dish_name: 'Fluffy Pancakes',
      description: 'Light and fluffy pancakes with maple syrup and fresh berries.',
      image_url: '/uploads/Pancakes.jpg',
      attendance_count: 25,
      is_attending: false,
    },
  ];

  const scrollRef = useRef(null);
  const [itemHeight, setItemHeight] = useState(0);

  useEffect(() => {
    if (scrollRef.current) {
      // Measure the height of one set of dummyMeals
      // Assuming all MealCards have roughly the same height and gap
      const firstItem = scrollRef.current.children[0];
      if (firstItem) {
        // Calculate the height of one MealCard including its bottom margin (gap-4 = 16px)ToRemove
        const itemTotalHeight = firstItem.offsetHeight + 16; 
        setItemHeight(itemTotalHeight * dummyMeals.length);
      }
    }
  }, [dummyMeals.length]);

  return (
    <section className="relative overflow-hidden bg-gray-900">
      <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl" aria-hidden="true">
        <div
          className="relative left-1/2 -z-10 aspect-[1108/632] w-[72rem] -translate-x-1/2 bg-gradient-to-tr from-matte-blue-start to-matte-blue-end opacity-30"
          style={{ clipPath: 'polygon(74% 44%, 100% 66%, 92% 100%, 46% 87%, 0 100%, 11% 55%, 22% 0, 43% 19%)' }}
        />
      </div>
      <div className="mx-auto max-w-7xl px-6 pt-24 pb-24 grid lg:grid-cols-12 gap-10 items-center">
        <motion.div className="lg:col-span-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-400 px-3 py-1 text-xs text-white">
            Built for chapters and scaled for nationals
          </div>
          <h1 className="mt-4 text-4xl md:text-6xl font-extrabold tracking-tight leading-tight text-white">
            Plan meals, collect feedback, run smoother.
          </h1>
          <p className="mt-4 text-gray-300 text-lg">
            Weekly menus, late plates, attendance, and reviews—all in one fast, mobile‑first experience. Access codes let you onboard chapters in minutes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="btn bg-white text-gray-900 hover:bg-gray-200">Create account</Link>
            <Link to="/login" className="btn bg-transparent border-gray-400 text-white hover:bg-gray-800">I have an access code</Link>
          </div>
        </motion.div>

        <motion.div className="lg:col-span-6 relative h-[700px] overflow-hidden rounded-3xl border border-gray-700 shadow-sm bg-gray-800 p-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
          <motion.div
            ref={scrollRef}
            className="absolute inset-0 flex flex-col gap-4 p-4"
            animate={itemHeight ? { y: [0, -itemHeight] } : {}}
            transition={{
              duration: 20,
              ease: 'linear',
              repeat: Infinity,
              repeatType: 'loop',
            }}
          >
            {dummyMeals.concat(dummyMeals).map((meal, i) => ( // Duplicate for seamless loop
              <MealCard key={i} meal={meal} />
            ))}
          </motion.div>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-3xl bg-matte-blue-end blur-2xl opacity-30" />
        </motion.div>
      </div>
    </section>
  );
}
