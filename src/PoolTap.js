import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './PoolTap.module.css';
import useTelegram from './useTelegram';  // Make sure this path is correct

const balls = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  src: `/balls/ball${i + 1}.png`,
  points: i + 1,
}));
const badBall = { id: 16, src: '/balls/ballWhite.png', points: -20 };

const generateRandomPosition = () => {
  const x = Math.random() * 75 + 5; // 5% to 80% to keep it within the container bounds
  return { x };
};

const PoolTap = ({ onUpdateXP, onUpdatePoold }) => {
  const [activeBalls, setActiveBalls] = useState([]);
  const [xp, setXp] = useState(0);
  const [gameTime, setGameTime] = useState(120); // 2 minutes
  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [isExploding, setIsExploding] = useState(false);
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const tg = useTelegram();

  useEffect(() => {
    if (tg) {
      tg.ready();
      const user = tg.initDataUnsafe.user;
      setUsername(user.username);
      console.log("Username:", user.username);
    }
  }, [tg]);

  const addBall = useCallback(() => {
    const random = Math.random();
    const ball = random < 0.1 ? badBall : balls[Math.floor(Math.random() * balls.length)];
    const position = generateRandomPosition();
    const newBall = { 
      ...ball, 
      position, 
      id: Date.now(),
      velocity: Math.random() * 2 + 1, // Random velocity between 1 and 3
      startTime: Date.now()
    };

    setActiveBalls((prevBalls) => [...prevBalls, newBall]);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (gameTime > 0) {
        setGameTime(gameTime - 1);
        addBall();
      } else {
        clearInterval(interval);
        endGame();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameTime, addBall]);

  const triggerHapticFeedback = (style) => {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
    }
  };

  const handleBallClick = (ball) => {
    if (ball.points === -20) {  // Identify bad ball by its points value
      triggerHapticFeedback('heavy');
      setIsExploding(true);
      setTimeout(() => {
        setActiveBalls([]);
        setCombo(0);
        setMultiplier(1);
        setIsExploding(false);
      }, 1000);
    } else {
      triggerHapticFeedback('light');
      const points = ball.points * multiplier;
      setXp((prevXp) => prevXp + points);
      setActiveBalls((prevBalls) => prevBalls.filter((b) => b.id !== ball.id));
      
      setCombo((prevCombo) => prevCombo + 1);
      if (combo % 5 === 0) {
        setMultiplier((prevMultiplier) => Math.min(prevMultiplier + 0.5, 3));
      }

      clearTimeout(window.comboResetTimer);
      window.comboResetTimer = setTimeout(() => {
        setCombo(0);
        setMultiplier(1);
      }, 2000);
    }
  };

  const endGame = async () => {
    const pooldScore = Math.floor(xp / 200);
    if (username) {
      try {
        await axios.post('https://task.pooldegens.meme/api/save_score', {
          username: username,
          score: pooldScore
        });
        console.log("Score saved successfully");
      } catch (error) {
        console.error('Error saving score:', error);
      }
    } else {
      console.error('Username not available, score not saved');
    }
    navigate('/gameover', { state: { score: pooldScore } });
  };

  useEffect(() => {
    onUpdateXP(xp);
    onUpdatePoold(Math.floor(xp / 200));
  }, [xp, onUpdateXP, onUpdatePoold]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      setActiveBalls((prevBalls) => 
        prevBalls.filter((ball) => {
          const elapsedTime = currentTime - ball.startTime;
          const animationDuration = 15000 / ball.velocity;
          return elapsedTime < animationDuration;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.poolTap}>
      {activeBalls.map((ball) => (
        <img
          key={ball.id}
          src={ball.src}
          alt={`ball-${ball.id}`}
          className={`${styles.ball} ${isExploding ? styles.exploding : ''}`}
          style={{
            left: `${ball.position.x}%`,
            animationDuration: `${15 / ball.velocity}s`,
            animationDelay: '0s',
            animationFillMode: 'both',
          }}
          onClick={() => handleBallClick(ball)}
        />
      ))}
      <div className={styles.gameInfo}>
        <span>Time: {gameTime}s</span>
        <span>XP: {xp}</span>
        <span>Multiplier: {multiplier.toFixed(1)}x</span>
      </div>
    </div>
  );
};

export default PoolTap;