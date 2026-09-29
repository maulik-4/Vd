import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
    const { pathname, search, hash } = useLocation();

    useEffect(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
    }, []);

    useLayoutEffect(() => {
        const scrollToTop = () => {
            window.scrollTo({ top: 0, left: 0, behavior: "instant" });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            const root = document.getElementById("root");
            if (root) root.scrollTop = 0;
        };

        // Scroll immediately
        scrollToTop();

        // Ensure scroll to top after layout/render cycles
        const rafId = requestAnimationFrame(scrollToTop);
        const timerId = setTimeout(scrollToTop, 50);
        const timerId2 = setTimeout(scrollToTop, 150);

        return () => {
            cancelAnimationFrame(rafId);
            clearTimeout(timerId);
            clearTimeout(timerId2);
        };
    }, [pathname, search, hash]);

    return null;
};

export default ScrollToTop;