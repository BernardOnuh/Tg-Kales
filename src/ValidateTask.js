import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './ValidateTask.css';

const ValidateTask = () => {
  const [pendingTasks, setPendingTasks] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage] = useState(10);

  useEffect(() => {
    fetchPendingTasks();
  }, []);

  const fetchPendingTasks = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('https://task.pooldegens.meme/api/get_pending_tasks');
      setPendingTasks(response.data);
      setError(null);
    } catch (error) {
      console.error("Error fetching pending tasks:", error);
      setError(`Failed to fetch pending tasks. ${error.response?.data?.details || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveTask = async (task) => {
    try {
      await axios.post('https://task.pooldegens.meme/api/approve_task', {
        taskId: task.taskId,
        username: task.username
      });
      setPendingTasks((prevTasks) => prevTasks.filter(t => t.taskId !== task.taskId));
      setSuccessMessage(`Task approved successfully for user ${task.username}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Error approving task:", error);
      setError("Failed to approve task. Please try again.");
    }
  };

  const handleRejectTask = async (task) => {
    try {
      await axios.post('https://task.pooldegens.meme/api/reject_task', {
        taskId: task.taskId,
        username: task.username
      });
      setPendingTasks((prevTasks) => prevTasks.filter(t => t.taskId !== task.taskId));
      setSuccessMessage(`Task rejected for user ${task.username}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Error rejecting task:", error);
      setError("Failed to reject task. Please try again.");
    }
  };

  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  // Pagination
  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = pendingTasks.slice(indexOfFirstTask, indexOfLastTask);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (isLoading) {
    return <div className="loading">Loading pending tasks...</div>;
  }

  return (
    <div className="validate-task-page">
      <h1>Pending Tasks for Validation</h1>
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      <div className="task-list">
        {currentTasks.length === 0 ? (
          <p>No pending tasks for validation.</p>
        ) : (
          currentTasks.map((task) => (
            <div key={task.taskId} className="task-item">
              <div className="task-info">
                <h3>{task.taskDescription}</h3>
                <p>Submitted by: {task.username}</p>
                <div className="evidence-container">
                  <img 
                    src={task.evidenceUrl} 
                    alt="Task Evidence" 
                    className="evidence-thumbnail" 
                    onClick={() => openImageModal(task.evidenceUrl)}
                  />
                  <button onClick={() => openImageModal(task.evidenceUrl)}>View Full Image</button>
                </div>
              </div>
              <div className="task-actions">
                <button onClick={() => handleApproveTask(task)} className="approve-button">Approve</button>
                <button onClick={() => handleRejectTask(task)} className="reject-button">Reject</button>
              </div>
            </div>
          ))
        )}
      </div>
      <Pagination
        tasksPerPage={tasksPerPage}
        totalTasks={pendingTasks.length}
        paginate={paginate}
        currentPage={currentPage}
      />
      {selectedImage && (
        <div className="image-modal" onClick={closeImageModal}>
          <img src={selectedImage} alt="Full size evidence" />
        </div>
      )}
    </div>
  );
};

const Pagination = ({ tasksPerPage, totalTasks, paginate, currentPage }) => {
  const pageNumbers = [];

  for (let i = 1; i <= Math.ceil(totalTasks / tasksPerPage); i++) {
    pageNumbers.push(i);
  }

  return (
    <nav>
      <ul className='pagination'>
        {pageNumbers.map(number => (
          <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
            <a onClick={() => paginate(number)} href='#!' className='page-link'>
              {number}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default ValidateTask;
