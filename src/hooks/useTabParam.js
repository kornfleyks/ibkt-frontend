import { useSearchParams } from "react-router-dom";

// Keeps a Tabs component's selected index in sync with a `?tab=<slug>`
// query param, so a tab is shareable/bookmarkable and survives a refresh.
// `tabs` must be an array of objects each with a unique `slug`.
function useTabParam(tabs, paramName = "tab") {

    const [searchParams, setSearchParams] = useSearchParams();

    const indexFromParam = tabs.findIndex((item) => item.slug === searchParams.get(paramName));
    const tab = indexFromParam === -1 ? 0 : indexFromParam;

    function setTab(newTab) {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set(paramName, tabs[newTab].slug);
            return next;
        }, { replace: true });
    }

    return [tab, setTab];

}

export default useTabParam;
