/* Reckon: names of calculators still being written, so the faces show what's coming.
   Each name leaves this list the moment its real calculator (with tests) exists. */
(function (R) {
  'use strict';
  R.PLANNED = {
    calc: ['Everyday + scientific keypad'],
    convert: ['Length', 'Area', 'Volume', 'Weight', 'Temperature', 'Speed', 'Pressure', 'Energy', 'Power', 'Data', 'Angle', 'Fuel economy', 'Flow', 'Cooking'],
    health: ['BMI', 'BMR', 'Daily calories', 'Body fat', 'Ideal weight', 'Water intake', 'Due date', 'Heart rate zones', 'Calories burned', 'Macros'],
    math: ['Percentage', 'Percent change', 'Fractions', 'Ratio', 'Mean, median, mode', 'Standard deviation', 'GCF & LCM', 'Prime factors', 'Quadratic', 'Rounding', 'Percent error', 'Scientific notation'],
    science: ["Ohm's law", 'Voltage drop', 'Electricity cost', 'Motor amps', 'Kinetic energy', 'Speed & acceleration', 'Torque & horsepower', 'Force', 'Ideal gas law', 'Dilution', 'Molar mass', 'Room BTU'],
    life: ['Dog age', 'Cat age', 'GPA', 'Grade', 'Recipe scaler', 'Freight class', 'Age difference'],
  };
})(globalThis.Reckon = globalThis.Reckon || {});
