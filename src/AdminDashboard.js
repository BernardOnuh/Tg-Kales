import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [username, setUsername] = useState('');
  const [score, setScore] = useState(0);
  const [weeklyScore, setWeeklyScore] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReferralsModal, setShowReferralsModal] = useState(false);
  const limit = 10;

  useEffect(() => {
    fetchUserCount();
    fetchUsers(currentPage);
  }, [currentPage]);

  const fetchUserCount = async () => {
    try {
      const response = await axios.get('https://task.pooldegens.meme/api/user_scores/count');
      setUserCount(response.data.count);
      setTotalPages(Math.ceil(response.data.count / limit));
    } catch (error) {
      console.error('Error fetching user count:', error);
    }
  };

  const fetchUsers = async (page) => {
    try {
      const response = await axios.get(`https://task.pooldegens.meme/api/user_scores?page=${page}&limit=${limit}`);
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const deleteUser = async (id) => {
    try {
      await axios.delete(`https://task.pooldegens.meme/api/user_scores/${id}`);
      fetchUsers(currentPage);
      fetchUserCount();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const editUser = async () => {
    try {
      const updatedDetails = { username, score, weekly_score: weeklyScore };
      await axios.put(`https://task.pooldegens.meme/api/user_scores/${selectedUser._id}`, updatedDetails);
      fetchUsers(currentPage);
      setShowEditModal(false);
    } catch (error) {
      console.error('Error editing user:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm) {
      fetchUsers(currentPage);
      return;
    }

    try {
      const response = await axios.get(`https://task.pooldegens.meme/api/user_scores/search?username=${searchTerm}`);
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const fetchReferrals = async (identifier) => {
    try {
      const response = await axios.get(`https://task.pooldegens.meme/api/user_scores/referrals/${identifier}`);
      setReferrals(response.data.referrals);
      setShowReferralsModal(true);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    }
  };

  const handleShowReferrals = async (user) => {
    if (!user.identifier) {
      console.error('User identifier is missing');
      return;
    }
    await fetchReferrals(user.identifier);
  };

  const handleEditUserClick = (user) => {
    setSelectedUser(user);
    setUsername(user.username);
    setScore(user.score);
    setWeeklyScore(user.weekly_score);
    setShowEditModal(true);
  };

  return (
    <div className="container">
      <h1>Admin Dashboard</h1>
      <p>Total Users: {userCount}</p>
      <div className="search-bar">
        <input 
          type="text" 
          placeholder="Search by username..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        <button onClick={handleSearch}>Search</button>
      </div>
      <ul className="user-list">
        {users.map(user => (
          <li key={user._id} className="user-item">
            <div>
              <strong>Identifier:</strong> {user._id}<br />
              <strong>Username:</strong> {user.username}<br />
              <strong>Score:</strong> {user.score}<br />
              <strong>Weekly Score:</strong> {user.weekly_score}<br />
              <strong>Referral Code:</strong> {user.referral_code}<br />
              <strong>Referrer:</strong> {user.referrer}<br />
              <strong>Referral Count:</strong> {user.referral_count}
            </div>
            <button className="delete" onClick={() => deleteUser(user._id)}>Delete</button>
            <button className="edit" onClick={() => handleEditUserClick(user)}>Edit</button>
            <button className="show-referrals" onClick={() => handleShowReferrals(user)}>Show Referrals</button>
          </li>
        ))}
      </ul>
      <div className="pagination">
        <button
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
      {showEditModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Edit User</h2>
            <label>Username:</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
            />
            <label>Score:</label>
            <input 
              type="number" 
              value={score} 
              onChange={(e) => setScore(e.target.value)} 
            />
            <label>Weekly Score:</label>
            <input 
              type="number" 
              value={weeklyScore} 
              onChange={(e) => setWeeklyScore(e.target.value)} 
            />
            <button onClick={editUser}>Save</button>
            <button onClick={() => setShowEditModal(false)}>Cancel</button>
          </div>
        </div>
      )}
      {showReferralsModal && selectedUser && (
        <div className="modal">
          <div className="modal-content">
            <h2>Referrals for {selectedUser.username}</h2>
            <ul>
              {referrals.map(referral => (
                <li key={referral._id}>
                  <strong>Username:</strong> {referral.username}<br />
                  <strong>Score:</strong> {referral.score}<br />
                  <strong>Referral Code:</strong> {referral.referral_code}
                </li>
              ))}
            </ul>
            <button onClick={() => setShowReferralsModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
