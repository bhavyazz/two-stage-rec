import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { logout, getUserEmail } from '../auth'

export default function NavBar() {
  const navigate = useNavigate()
  const email = getUserEmail()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="navbar">
      <div className="nav-inner container">
        <div className="brand-row">
          <div className="nav-logo" aria-hidden />
          <div>
            <div className="brand-small">HealthCare</div>
            <div className="muted small">Trusted wellness platform</div>
          </div>
        </div>

        <nav className="nav-links">
          <NavLink to="/" className="nav-link">Dashboard</NavLink>
          <NavLink to="/pantry" className="nav-link">Pantry</NavLink>
          <NavLink to="/nutrition" className="nav-link">Nutrition</NavLink>
          <NavLink to="/scanner" className="nav-link">Scanner</NavLink>
        </nav>

        <div className="nav-actions">
          <div className="muted small">{email}</div>
          <NavLink to="/substitution" className="btn" style={{marginRight:6}}>Healthy Swaps</NavLink>
          <button className="btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
