import LoadingOverlay from "./LoadingOverlay";
import { useLoading } from "../../context/LoadingContext";

function LoadingRoot() {

    const {
        loading,
        message
    } = useLoading();

    return (

        <LoadingOverlay
            open={loading}
            message={message}
        />

    );

}

export default LoadingRoot;