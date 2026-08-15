import React, { useEffect, useState } from 'react';
import { supabase } from '../client';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import './CreateAccount.css';
import { FiSearch, FiPlus, FiTrash2 } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CreateAccount = () => {
  const { ignoreNextAuthChange, user} = useAuth();

  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [submittedAddUser, setSubmittedAddUser] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    role: '',
    email: '',
    username: '',
    password: ''
  });

  const [editData, setEditData] = useState({
    u_id: '',
    first_name: '',
    last_name: '',
    role: '',
    username: ''
  });

  const role = user?.user_metadata?.role || '';
  const firstName = user?.user_metadata?.first_name || '';
  const lastName = user?.user_metadata?.last_name || '';

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    const { data, error } = await supabase
      .from('USER')
      .select('u_id, f_name, l_name, role, username, email')
      .order('u_id', { ascending: false });

    if (error) {
      console.log('Fetch error:', error);
      toast.error('Failed to load users');
      return;
    }

    setProfiles(data || []);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear email error when user types @
    if (name === 'email') {
      if (value.includes('@')) {
        setEmailError('');
      }
    }
  }

  function handleEditChange(e) {
    setEditData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  }

  async function addUser(e) {
    e.preventDefault();
    setSubmittedAddUser(true);

    // Validate email format
    if (formData.email && !validateEmail(formData.email)) {
      setEmailError('Please include an "@" in the email address.');
      return;
    } else {
      setEmailError('');
    }

    // Check if username already exists
    const { data: existingUsername, error: usernameCheckError } = await supabase
      .from('USER')
      .select('username')
      .eq('username', formData.username)
      .maybeSingle();

    if (existingUsername) {
      toast.error('User is already registered');
      return;
    }

    // Validate password length
    if (formData.password && formData.password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    } else {
      setPasswordError('');
    }

    if (
      !formData.first_name ||
      !formData.last_name ||
      !formData.role ||
      !formData.username ||
      !formData.email ||
      !formData.password
    ) {
      return;
    }

    setLoading(true);

    // Store the original session BEFORE creating the new user
    const { data: { session: originalSession } } = await supabase.auth.getSession();
    
    if (!originalSession) {
      toast.error('No active session found');
      setLoading(false);
      return;
    }

    // Tell the auth context to ignore the upcoming auth change
    ignoreNextAuthChange();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: formData.role,
            username: formData.username
          }
        }
      });

      if (error) throw error;

      const userId = data.user?.id;

      // Insert into USER table
      await supabase.from('USER').insert([
        {
          id: userId,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          email: formData.email,
          username: formData.username
        }
      ]);

      // Wait a bit for the auth state to settle
      await new Promise(resolve => setTimeout(resolve, 300));

      // IMPORTANT: Use setSession to restore the original session
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: originalSession.access_token,
        refresh_token: originalSession.refresh_token
      });

      if (setSessionError) {
        console.error('Error restoring session:', setSessionError);
        // Try refreshing the session as fallback
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          throw refreshError;
        }
        if (refreshedSession) {
          await supabase.auth.setSession({
            access_token: refreshedSession.access_token,
            refresh_token: refreshedSession.refresh_token
          });
        }
      }

      // Verify the session was restored
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.user?.id !== originalSession.user.id) {
        console.warn('Session restoration may have failed, attempting again...');
        await supabase.auth.setSession({
          access_token: originalSession.access_token,
          refresh_token: originalSession.refresh_token
        });
      }

      // Reset form and close modal
      setFormData({
        first_name: '',
        last_name: '',
        role: '',
        email: '',
        username: '',
        password: ''
      });

      setSubmittedAddUser(false);
      setShowAddModal(false);
      await fetchProfiles();

      toast.success('User created successfully');
    } catch (err) {
      console.error('Error creating user:', err);
      toast.error(err.message || 'Failed to create user');
      
      // Try to restore session even if there was an error
      if (originalSession) {
        try {
          await supabase.auth.setSession({
            access_token: originalSession.access_token,
            refresh_token: originalSession.refresh_token
          });
        } catch (restoreError) {
          console.error('Failed to restore session after error:', restoreError);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  function openEdit(user) {
    setEditData(user);
    setShowEditModal(true);
  }

  async function updateUser(e) {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('USER')
        .update({
          first_name: editData.first_name,
          last_name: editData.last_name,
          role: editData.role,
          username: editData.username
        })
        .eq('u_id', editData.u_id);

      if (error) throw error;

      toast.success('User updated successfully');
      setShowEditModal(false);
      fetchProfiles();

    } catch (err) {
      console.log(err);
      toast.error('Failed to update user');
    }
  }

  function openDeleteModal(user) {
    setSelectedUser(user);
    setShowDeleteModal(true);
  }

  async function confirmDeleteUser() {
    try {
      // Store the current session BEFORE deleting
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      // Delete the user from USER table
      const { error } = await supabase
        .from('USER')
        .delete()
        .eq('u_id', selectedUser.u_id);

      if (error) throw error;

      // Restore your original session
      if (currentSession) {
        await supabase.auth.setSession(
          currentSession.access_token,
          currentSession.refresh_token
        );
      }

      toast.success('User deleted successfully');
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchProfiles();

    } catch (err) {
      console.log('Delete error:', err);
      toast.error('Failed to delete user');
    }
  }

  const filteredProfiles = profiles.filter((p) => {
    const searchText = search.toLowerCase();

    const firstName = (p.f_name || '').toLowerCase();
    const lastName = (p.l_name || '').toLowerCase();

    return (
      firstName.includes(searchText) ||
      lastName.includes(searchText)
    );
  });

  return (
    <div className="createaccount-page">

      <Sidebar role={role} firstName={firstName} lastName={lastName} />
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="createaccount-header-row">
        {role === 'admin' && (
          <h1>User Management</h1>
        )}
        
        {role === 'admin' && (
          <button className="adduser" onClick={() => setShowAddModal(true)}>
            <FiPlus className="icon" />
            Create User
          </button>
        )}
      </div>

      <div className="createaccount-topwrapper">
        <div className="createaccount-top-controls">
          <div className="createaccount-search-container">
            <FiSearch className="createaccount-search-icon" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="createaccount-search-bar"
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="createaccount-table-container">
          {(role === 'admin') && (
            <table className="createaccount-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredProfiles.map((user) => (
                  <tr key={user.u_id}>
                    <td>{user.f_name} {user.l_name}</td>
                    <td>
                      {user.role
                        ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                        : ''}
                    </td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      <button
                        className="createaccount-del-btn"
                        onClick={() => openDeleteModal(user)}
                      >
                        <FiTrash2 color="rgb(219, 32, 32)" size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

        {/* ADD MODAL */}
        {showAddModal && (
          <div className="createaccount-modal-overlay">
            <div className="createaccount-modal">
              <h2>Add User</h2>

              <form onSubmit={addUser}>
                <label>First Name<span className="user_required">*</span></label>
                <input
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className={submittedAddUser && !formData.first_name ? "userinput-error" : ""}
                />

                {submittedAddUser && !formData.first_name && (
                  <span className="usererror-text">First name is required.</span>
                )}

                <label>Last Name<span className="user_required">*</span></label>
                <input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className={submittedAddUser && !formData.last_name ? "userinput-error" : ""}
                />

                {submittedAddUser && !formData.last_name && (
                  <span className="usererror-text">Last name is required.</span>
                )}

                <label>Role<span className="user_required">*</span></label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className={submittedAddUser && !formData.role ? "userinput-error" : ""}
                >
                  <option value="">Select Role</option>
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                  <option value="dispatcher">Dispatcher</option>
                </select>

                {submittedAddUser && !formData.role && (
                  <span className="usererror-text">
                    Role is required.
                  </span>
                )}

                <label>Username<span className="user_required">*</span></label>
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={submittedAddUser && !formData.username ? "userinput-error" : ""}
                />

                {submittedAddUser && !formData.username && (
                  <span className="usererror-text">Username is required.</span>
                )}

                <label>Email<span className="user_required">*</span></label>
                <input
                  name="email"
                  type="text"
                  value={formData.email}
                  onChange={handleChange}
                  className={(submittedAddUser && !formData.email) || emailError ? "userinput-error" : ""}
                  onInvalid={(e) => e.preventDefault()}
                />

                {submittedAddUser && !formData.email && (
                  <span className="usererror-text">Email is required.</span>
                )}

                {submittedAddUser && emailError && (
                  <span className="usererror-text">{emailError}</span>
                )}

                <label>Password<span className="user_required">*</span></label>
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={submittedAddUser && !formData.password ? "userinput-error" : ""}
                />

                {submittedAddUser && !formData.password && (
                  <span className="usererror-text">Password is required.</span>
                )}

                {submittedAddUser && passwordError && (
                  <span className="usererror-text">{passwordError}</span>
                )}

                <div className="accmodal-actions">
                  <button className="adduser" type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Account'}
                  </button>

                  <button
                    className="createaccount-cancel-btn"
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setSubmittedAddUser(false);
                      setFormData({
                        first_name: '',
                        last_name: '',
                        role: '',
                        email: '',
                        username: '',
                        password: ''
                      });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {showEditModal && (
          <div className="createaccount-modal-overlay">
            <div className="createaccount-modal">
              <h2>Edit User</h2>

              <form onSubmit={updateUser}>
                <label>First Name</label>
                <input name="first_name" value={editData.first_name} onChange={handleEditChange} required />

                <label>Last Name</label>
                <input name="last_name" value={editData.last_name} onChange={handleEditChange} required />

                <label>Role</label>
                <select name="role" value={editData.role} onChange={handleEditChange}>
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                  <option value="dispatcher">Dispatcher</option>
                </select>

                <label>Username</label>
                <input name="username" value={editData.username} onChange={handleEditChange} required />

                <div className="accmodal-actions">
                  <button type="submit" className="adduser">Save</button>
                  <button type="button" className="createaccount-cancel-btn" onClick={() => setShowEditModal(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE MODAL */}
        {showDeleteModal && (
          <div className="createaccount-delete-modal">
            <div className="createaccount-delete-modal-content">
              <p>
                Are you sure you want to delete <strong>{selectedUser?.f_name} {selectedUser?.l_name}</strong>?
              </p>

              <div className="modal-actions">
                <button className="createaccount-confirm-delete-btn" onClick={confirmDeleteUser}>
                  Delete
                </button>

                <button className="createaccount-cancel-delete-btn" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default CreateAccount;