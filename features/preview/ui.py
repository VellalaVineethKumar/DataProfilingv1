"""Preview Component - Performance-optimized data preview"""

import streamlit as st
import pandas as pd
import math


def render_preview():
    """Performance-optimized data preview with pagination"""
    
    state = st.session_state.app_state
    
    if state.df is None:
        st.info("No data loaded")
        return
    
    st.markdown('<div class="card">', unsafe_allow_html=True)
    st.markdown('<div class="card-header">Data Preview</div>', unsafe_allow_html=True)
    
    df = state.df
    
    # Dataset info
    info_col1, info_col2, info_col3, info_col4 = st.columns(4)
    with info_col1:
        st.metric("Total Rows", f"{len(df):,}")
    with info_col2:
        st.metric("Total Columns", len(df.columns))
    with info_col3:
        st.metric("Memory", f"{df.memory_usage(deep=True).sum() / 1024 / 1024:.1f} MB")
    with info_col4:
        # Data types summary
        dtype_counts = df.dtypes.value_counts()
        st.metric("Data Types", len(dtype_counts))
    
    # Pagination controls
    st.divider()
    
    PAGE_SIZES = [100, 500, 1000, 5000, 10000]
    
    if 'preview_page' not in st.session_state:
        st.session_state.preview_page = 1
    
    pag_col1, pag_col2, pag_col3, pag_col4 = st.columns([1, 1, 1, 2])
    
    with pag_col1:
        page_size = st.selectbox("Rows per page:", PAGE_SIZES, index=0, key="prev_page_size")
    
    total_pages = max(1, math.ceil(len(df) / page_size))
    
    current_page = min(st.session_state.preview_page, total_pages)
    
    with pag_col2:
        page_num = st.number_input(
            "Page:", min_value=1, max_value=total_pages,
            value=current_page, key="prev_page_num"
        )
        if page_num != st.session_state.preview_page:
            st.session_state.preview_page = page_num
    
    with pag_col3:
        st.metric("Total Pages", total_pages)
    
    with pag_col4:
        nav_cols = st.columns(4)
        with nav_cols[0]:
            if st.button("First", use_container_width=True, key="prev_first"):
                st.session_state.preview_page = 1
                st.rerun()
        with nav_cols[1]:
            if st.button("Prev", use_container_width=True, key="prev_prev"):
                if page_num > 1:
                    st.session_state.preview_page = page_num - 1
                    st.rerun()
        with nav_cols[2]:
            if st.button("Next", use_container_width=True, key="prev_next"):
                if page_num < total_pages:
                    st.session_state.preview_page = page_num + 1
                    st.rerun()
        with nav_cols[3]:
            if st.button("Last", use_container_width=True, key="prev_last"):
                st.session_state.preview_page = total_pages
                st.rerun()
    
    # Calculate slice
    start_idx = (page_num - 1) * page_size
    end_idx = min(start_idx + page_size, len(df))
    
    # Column selection for performance
    st.divider()
    
    col1, col2 = st.columns([3, 1])
    
    with col1:
        all_cols = df.columns.tolist()
        selected_cols = st.multiselect("Select columns to display:", 
                                      all_cols,
                                      default=all_cols[:20] if len(all_cols) > 20 else all_cols,
                                      key="preview_selected_cols")
    
    with col2:
        # Search within data
        search_term = st.text_input("Search in data:", "", key="preview_search")
    
    # Get data slice
    if selected_cols:
        display_df = df.iloc[start_idx:end_idx][selected_cols]
    else:
        display_df = df.iloc[start_idx:end_idx]
    
    # Apply search filter
    if search_term:
        mask = display_df.astype(str).apply(lambda x: x.str.contains(search_term, case=False, na=False))
        display_df = display_df[mask.any(axis=1)]
        st.info(f"Search found {len(display_df)} matching rows")
    
    # Display with performance optimization
    st.markdown(f"**Showing rows {start_idx:,} to {end_idx:,} of {len(df):,}**")
    
    # Use st.dataframe with optimized settings
    st.dataframe(
        display_df,
        use_container_width=True,
        height=600,
        column_config={
            str(col): st.column_config.Column(
                str(col),
                help=f"Type: {df[col].dtype}",
                width="medium"
            ) for col in display_df.columns
        }
    )
    
    # Download current view
    st.divider()
    
    if st.button("Download Current View as CSV", use_container_width=True, key="prev_dl_csv"):
        csv = display_df.to_csv(index=False)
        st.download_button(
            "Click to Download",
            data=csv,
            file_name=f"preview_rows_{start_idx}_to_{end_idx}.csv",
            mime="text/csv",
            key="prev_dl_csv_btn"
        )
    
    st.markdown('</div>', unsafe_allow_html=True)