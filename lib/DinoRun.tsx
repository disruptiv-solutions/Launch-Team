"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';

export const DinoRun = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game constants
  const CANVAS_WIDTH = 280;
  const CANVAS_HEIGHT = 100;
  const DINO_WIDTH = 20;
  const DINO_HEIGHT = 20;
  const OBSTACLE_WIDTH = 15;
  const OBSTACLE_HEIGHT = 20;
  const GRAVITY = 0.6;
  const JUMP_FORCE = -10;
  const GROUND_Y = 80;

  // Game state refs to avoid closure issues in the game loop
  const gameState = useRef({
    dinoY: GROUND_Y - DINO_HEIGHT,
    dinoVelocity: 0,
    isJumping: false,
    obstacles: [] as { x: number }[],
    frame: 0,
    speed: 4,
  });

  const resetGame = useCallback(() => {
    gameState.current = {
      dinoY: GROUND_Y - DINO_HEIGHT,
      dinoVelocity: 0,
      isJumping: false,
      obstacles: [],
      frame: 0,
      speed: 4,
    };
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
  }, []);

  const jump = useCallback(() => {
    if (!gameState.current.isJumping && !gameOver && isPlaying) {
      gameState.current.dinoVelocity = JUMP_FORCE;
      gameState.current.isJumping = true;
    }
  }, [gameOver, isPlaying]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isPlaying && !gameOver) resetGame();
        else if (gameOver) resetGame();
        else jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver, resetGame, jump]);

  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const update = () => {
      const state = gameState.current;
      state.frame++;

      // Physics
      state.dinoVelocity += GRAVITY;
      state.dinoY += state.dinoVelocity;

      if (state.dinoY > GROUND_Y - DINO_HEIGHT) {
        state.dinoY = GROUND_Y - DINO_HEIGHT;
        state.dinoVelocity = 0;
        state.isJumping = false;
      }

      // Obstacles
      if (state.frame % 60 === 0) {
        state.obstacles.push({ x: CANVAS_WIDTH });
      }

      state.obstacles = state.obstacles.map(obs => ({ x: obs.x - state.speed }));
      state.obstacles = state.obstacles.filter(obs => obs.x > -OBSTACLE_WIDTH);

      // Collision
      for (const obs of state.obstacles) {
        if (
          obs.x < 20 + DINO_WIDTH &&
          obs.x + OBSTACLE_WIDTH > 20 &&
          state.dinoY + DINO_HEIGHT > GROUND_Y - OBSTACLE_HEIGHT
        ) {
          setGameOver(true);
          setIsPlaying(false);
          return;
        }
      }

      // Score
      if (state.frame % 10 === 0) {
        setScore(s => s + 1);
      }
      
      // Speed up
      if (state.frame % 500 === 0) {
        state.speed += 0.5;
      }

      // Draw
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Ground
      ctx.strokeStyle = '#444';
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();

      // Dino (Simple square for now)
      ctx.fillStyle = '#6366f1'; // indigo-500
      ctx.fillRect(20, state.dinoY, DINO_WIDTH, DINO_HEIGHT);

      // Obstacles
      ctx.fillStyle = '#ef4444'; // red-500
      state.obstacles.forEach(obs => {
        ctx.fillRect(obs.x, GROUND_Y - OBSTACLE_HEIGHT, OBSTACLE_WIDTH, OBSTACLE_HEIGHT);
      });

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, gameOver]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
    }
  }, [score, highScore]);

  return (
    <div 
      className="p-4 bg-neutral-900 border-t border-neutral-800 select-none"
      onClick={(e) => {
        e.stopPropagation();
        if (!isPlaying && !gameOver) resetGame();
        else if (gameOver) resetGame();
        else jump();
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Dino Run</span>
        <div className="flex gap-3 text-[10px] font-mono text-neutral-400">
          <span>HI {highScore.toString().padStart(5, '0')}</span>
          <span>{score.toString().padStart(5, '0')}</span>
        </div>
      </div>
      
      <div className="relative bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800 cursor-pointer h-[100px] flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT}
          className="w-full h-full"
        />
        
        {!isPlaying && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
            <p className="text-xs font-bold text-white mb-1">READY?</p>
            <p className="text-[9px] text-neutral-400">CLICK TO START</p>
          </div>
        )}
        
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
            <p className="text-xs font-bold text-red-500 mb-1">GAME OVER</p>
            <p className="text-[9px] text-neutral-400 underline uppercase tracking-widest">Try Again</p>
          </div>
        )}
      </div>
      <p className="mt-2 text-[9px] text-neutral-500 text-center">Click or Space to jump</p>
    </div>
  );
};
