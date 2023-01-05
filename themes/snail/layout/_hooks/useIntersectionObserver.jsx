import React, { useEffect } from 'react';

export default function useIntersectionObserver(callback, selector, options = { disconnectOnTrigger: true }) {
  if (!selector) return;

  useEffect(() => {
    let vobserver;
    let uninstall;
    /* scroll listener */
    if (window.IntersectionObserver) {
      vobserver = new IntersectionObserver(function (entrys) {
        entrys.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          if (options.disconnectOnTrigger) {
            vobserver.unobserve(entry.target);
            vobserver.disconnect();
            uninstall = callback();
          } else {
            uninstall && uninstall();
            uninstall = callback();
          }
        });
      });
      vobserver.observe(document.querySelector(selector));
    } else {
      uninstall = callback();
    }

    return () => {
      vobserver && vobserver.disconnect();
      uninstall && uninstall();
    };
  }, []);
}
