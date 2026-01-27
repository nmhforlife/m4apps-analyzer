import React, { createContext, useContext, useReducer } from 'react';

const CatalogContext = createContext();

const initialState = {
  catalogs: [],
  selectedCatalog: null,
  loading: false,
  error: null,
  comparisons: [],
};

function catalogReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'ADD_CATALOG':
      return {
        ...state,
        catalogs: [...state.catalogs, { ...action.payload, id: action.payload.id || Date.now() }],
        loading: false,
        error: null,
      };
    
    case 'SELECT_CATALOG':
      return { ...state, selectedCatalog: action.payload };
    
    case 'REMOVE_CATALOG':
      return {
        ...state,
        catalogs: state.catalogs.filter(catalog => catalog.id !== action.payload),
        selectedCatalog: state.selectedCatalog?.id === action.payload ? null : state.selectedCatalog,
      };
    
    case 'UPDATE_CATALOG':
      return {
        ...state,
        catalogs: state.catalogs.map(catalog => 
          catalog.id === action.payload.id ? action.payload : catalog
        ),
        selectedCatalog: state.selectedCatalog?.id === action.payload.id ? action.payload : state.selectedCatalog,
      };
    
    case 'ADD_COMPARISON':
      return {
        ...state,
        comparisons: [...state.comparisons, { ...action.payload, id: Date.now() }],
      };
    
    case 'CLEAR_CATALOGS':
      return {
        ...state,
        catalogs: [],
        selectedCatalog: null,
        comparisons: [],
      };
    
    case 'UPDATE_CATALOG':
      return {
        ...state,
        catalogs: state.catalogs.map(catalog => 
          catalog.id === action.payload.id ? { ...catalog, ...action.payload } : catalog
        ),
        selectedCatalog: state.selectedCatalog?.id === action.payload.id 
          ? { ...state.selectedCatalog, ...action.payload } 
          : state.selectedCatalog,
      };
    
    default:
      return state;
  }
}

export function CatalogProvider({ children }) {
  const [state, dispatch] = useReducer(catalogReducer, initialState);

  const addCatalog = (catalogData) => {
    dispatch({ type: 'ADD_CATALOG', payload: catalogData });
  };

  const selectCatalog = (catalog) => {
    dispatch({ type: 'SELECT_CATALOG', payload: catalog });
  };

  const removeCatalog = (catalogId) => {
    dispatch({ type: 'REMOVE_CATALOG', payload: catalogId });
  };

  const setLoading = (loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const addComparison = (comparisonData) => {
    dispatch({ type: 'ADD_COMPARISON', payload: comparisonData });
  };

  const clearCatalogs = () => {
    dispatch({ type: 'CLEAR_CATALOGS' });
  };

  const updateCatalog = (catalogData) => {
    dispatch({ type: 'UPDATE_CATALOG', payload: catalogData });
  };

  const value = {
    ...state,
    addCatalog,
    selectCatalog,
    removeCatalog,
    setLoading,
    setError,
    addComparison,
    clearCatalogs,
    updateCatalog,
  };

  return (
    <CatalogContext.Provider value={value}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return context;
}