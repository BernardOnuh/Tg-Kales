// src/components/ShowUsers.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import styled from 'styled-components';

const socket = io('https://task.pooldegens.com/api');

const UserCountWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    font-size: 10rem;
    background-color: #282c34;
    color: white;
`;

const ShowUsers = () => {
    const [userCount, setUserCount] = useState(0);

    useEffect(() => {
        const fetchUserCount = async () => {
            try {
                const response = await axios.get('https://task.pooldegens.com/api/user_count');
                setUserCount(response.data.count);
            } catch (error) {
                console.error('Error fetching user count:', error);
            }
        };

        fetchUserCount();

        socket.on('update_user_count', (count) => {
            setUserCount(count);
        });

        return () => {
            socket.off('update_user_count');
        };
    }, []);

    return (
        <UserCountWrapper>
            {userCount.toLocaleString()}
        </UserCountWrapper>
    );
};

export default ShowUsers;
