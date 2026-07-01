import React, { useRef, useState } from 'react';
import { motion, useAnimationFrame } from 'framer-motion';
import type { ProjectExample } from '../content/sectorsData';

interface ProjectGalleryProps {
  projects: ProjectExample[];
}

export const ProjectGallery: React.FC<ProjectGalleryProps> = ({ projects }) => {
  // Flatten all images and associate them with their project data
  const galleryItems = projects.flatMap(proj => 
    proj.images.map(img => ({
      image: img,
      title: proj.title,
      client: proj.client,
      highlight: proj.highlight,
      scope: proj.scope,
      year: proj.year
    }))
  );

  // If we don't have enough items to fill a screen, duplicate them
  const displayItems = [...galleryItems, ...galleryItems, ...galleryItems];

  const containerRef = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const speed = 1.5; // Pixels per frame

  useAnimationFrame(() => {
    if (isHovered) return;
    
    setX((prevX) => {
      // Approximate width of one set of items. 
      // 400px (width) + 32px (gap) = 432px per item
      const singleSetWidth = galleryItems.length * 432; 
      
      if (prevX <= -singleSetWidth) {
        return 0; // Reset loop seamlessly
      }
      return prevX - speed;
    });
  });

  return (
    <div className="relative w-full overflow-hidden bg-bg py-8">
      {/* Cinematic Gradient Fades */}
      <div className="absolute top-0 bottom-0 left-0 w-32 z-10 bg-gradient-to-r from-bg to-transparent pointer-events-none"></div>
      <div className="absolute top-0 bottom-0 right-0 w-32 z-10 bg-gradient-to-l from-bg to-transparent pointer-events-none"></div>

      <motion.div 
        ref={containerRef}
        className="flex gap-8 cursor-grab active:cursor-grabbing"
        style={{ x }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onPointerDown={() => setIsHovered(true)}
        onPointerUp={() => setIsHovered(false)}
      >
        {displayItems.map((item, idx) => (
          <div 
            key={idx} 
            className="relative flex-shrink-0 w-[320px] sm:w-[400px] aspect-[4/5] rounded-none overflow-hidden group"
          >
            {/* Image */}
            <img 
              src={item.image} 
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
            
            {/* Dark Overlay on Hover */}
            <div className="absolute inset-0 bg-[#0F0F11]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Glassmorphism Fact Card */}
            <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out">
              <div className="backdrop-blur-md bg-surface/80 border border-border/50 p-6 shadow-2xl">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-text font-black uppercase tracking-tight text-sm leading-snug">
                    {item.title}
                  </h4>
                  <span className="text-primary text-[10px] font-black bg-primary/10 px-2 py-1 uppercase tracking-widest whitespace-nowrap ml-4">
                    {item.year}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-bold">
                    <span className="text-text">Заказчик:</span> {item.client}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-bold line-clamp-2">
                    <span className="text-text">Объем:</span> {item.scope}
                  </p>
                </div>

                <div className="border-t border-border/50 pt-3 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 flex-shrink-0"></span>
                  <p className="text-[10px] text-text font-bold uppercase tracking-widest">
                    {item.highlight}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};
