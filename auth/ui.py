import os
import streamlit as st
from .logic import authenticate

def render_login_screen():
    """Render the login form"""

    # Vertical spacer
    st.markdown("<div style='height: 2rem'></div>", unsafe_allow_html=True)

    # Centered card container
    _, col, _ = st.columns([1, 2, 1])

    with col:
        st.markdown("""
        <div class="login-card">
            <div class="login-header">
                <h2>Master Data Profiler</h2>
                <p>Sign in to the data quality platform</p>
            </div>
        </div>
        """, unsafe_allow_html=True)

        # Form inputs (rendered by Streamlit, below the HTML card header)
        st.markdown("<div style='height: 0.5rem'></div>", unsafe_allow_html=True)

        username = st.text_input("Username", placeholder="Enter your username", key="login_username")
        password = st.text_input("Password", type="password", placeholder="Enter your password", key="login_password")

        # hide login button if username and password is empty conditionaly
        if username and password:
            submit = st.button("Sign In", use_container_width=True, type="primary", key="login_submit")

            if submit:
                user_info = authenticate(username, password)
                if user_info:
                    st.session_state.app_state.authenticated = True
                    st.session_state.app_state.user_name = user_info['name']
                    st.session_state.app_state.username = user_info['username']

                    from state.session import _save_persisted_data
                    _save_persisted_data()

                    try:
                        from core.audit_log import log_action
                        log_action("Login", username=user_info['username'], category="auth")
                    except Exception:
                        pass

                    st.success(f"Welcome back, {user_info['name']}!")
                    st.rerun()
                else:
                    st.error("Invalid username or password")
                    # make image in center
                    _, col_img, _ = st.columns([1, 2, 1])
                    with col_img:
                        st.caption("If you wanted to access this tool kindly pay and get your credentials, for trial one day 5000, for one month 10000, for one year 50000")
                        qr_path = "assets/Images/QR.jpg"
                        if os.path.exists(qr_path):
                            st.image(qr_path, caption="Scan to Pay", use_column_width=True)
