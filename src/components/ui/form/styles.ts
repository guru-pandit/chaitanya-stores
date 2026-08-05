// No horizontal padding here — text/textarea inputs add px-3 themselves;
// Select needs asymmetric padding (room for its custom chevron on the right)
// so it adds pl-3 + the chevron's own pr-10 instead of a plain px-3.
export const fieldBaseClasses =
  "w-full rounded-lg border border-maroon/20 bg-white py-2.5 text-sm outline-none focus:border-terracotta";

export const fieldInputClasses = `${fieldBaseClasses} px-3`;
