import { useEffect, useState } from "react";

function useResponsive() {

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);


    useEffect(() => {

        function handleResize() {
            setWindowWidth(window.innerWidth);
        }

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };

    }, []);


    return {

        isMobile: windowWidth < 768,

        isTablet:
            windowWidth >= 768 &&
            windowWidth < 1200,

        isDesktop:
            windowWidth >= 1200

    };

}

export default useResponsive;