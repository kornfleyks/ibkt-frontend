import { useLayout } from "../../context/LayoutContext";

function SidebarFooter() {

    const { sidebarOpen } = useLayout();

    return (

        <div
            style={{
                marginTop: 'auto',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                textAlign: sidebarOpen ? 'left' : 'center'
            }}
        >

            <div
                style={{
                    fontWeight: 600
                }}
            >
                {sidebarOpen ? 'VK' : '👤'}
            </div>


            {sidebarOpen && (

                <>
                    <div
                        style={{
                            fontSize: '14px',
                            opacity: 0.8
                        }}
                    >
                        Administrator
                    </div>


                    <div
                        style={{
                            fontSize: '12px',
                            opacity: 0.5,
                            marginTop: '10px'
                        }}
                    >
                        v0.1.0
                    </div>

                </>

            )}

        </div>

    );

}

export default SidebarFooter;