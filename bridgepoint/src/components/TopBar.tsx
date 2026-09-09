import { NavLink, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';

export function TopBar() {
  const { session, signOut } = useSession();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <NavLink to="/" className="brand">
        BridgePoint
      </NavLink>

      {session && (
        <nav>
          {session.role === 'staff' ? (
            <>
              <NavLink to="/referrals">Referrals</NavLink>
              <NavLink to="/referrals/new">New referral</NavLink>
              <NavLink to="/partners">Partners</NavLink>
            </>
          ) : (
            <NavLink to="/inbox">Inbox</NavLink>
          )}
        </nav>
      )}

      <div className="spacer" />

      {session && (
        <>
          <span className="who">
            {session.name}
            {session.orgName ? ` · ${session.orgName}` : ''}
          </span>
          <button
            className="secondary small"
            onClick={() => {
              signOut();
              navigate('/');
            }}
          >
            Sign out
          </button>
        </>
      )}
    </header>
  );
}
