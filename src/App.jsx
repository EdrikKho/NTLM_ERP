import React, { useState, useEffect } from 'react';
import { 
  CreateAccount, 
  Login, 
  Dashboard, 
  Customers, 
  Employees, 
  Suppliers, 
  Inventory,
  SalesOrders,
  PurchaseOrders,
  InventoryTransfer,
  Payments,
  Reports
} from './Pages';
import {Routes, Route} from 'react-router-dom';


import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {

  const [token, setToken] = useState(false)

  if(token){
    sessionStorage.setItem('token',JSON.stringify(token))
  }

  useEffect (() => {
    if(sessionStorage.getItem('token')){
      let data = JSON.parse(sessionStorage.getItem('token'))
      setToken(data)
    }

  }, [])

  return (
    <div>

  
      <ToastContainer />

      <Routes>
        <Route path={'/dashboard'} element={ <Dashboard />} /> 
        <Route path={'/customers'} element={ <Customers />} />
        <Route path={'/employees'} element={ <Employees />} />
        <Route path={'/suppliers'} element={ <Suppliers />} />
        <Route path={'/inventory'} element={ <Inventory />} />
        <Route path={'/salesorders'} element={ <SalesOrders />} />
        <Route path={'/purchaseorders'} element={ <PurchaseOrders />} />
        <Route path={'/inventorytransfer'} element={ <InventoryTransfer />} />
        <Route path={'/payments'} element={ <Payments />} />
        <Route path={'/reports'} element={ <Reports />} />
        <Route path={'/'} element={ <Login setToken={setToken}/>} />
        {token ? <Route path={'/createaccount'} element={ <CreateAccount token={token}/>} /> : ""} 
      </Routes>
    </div>
  )
}

export default App