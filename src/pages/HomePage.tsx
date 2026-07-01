import React from 'react';
import { Hero } from '../components/Hero';
import { Sectors } from '../components/Sectors';
import { Services } from '../components/Services';
import { Capacity } from '../components/Capacity';
import { Materials } from '../components/Materials';
import { Certificates } from '../components/Certificates';
import { ContactForm } from '../components/ContactForm';

export const HomePage: React.FC = () => {
  return (
    <>
      {/* Hero Intro */}
      <Hero />

      {/* Profile Sectors */}
      <Sectors />

      {/* Core Services/Techs */}
      <Services />

      {/* Production Fleet/Stats */}
      <Capacity />

      {/* Supplied Materials */}
      <Materials />

      {/* Standards & Certifications */}
      <Certificates />

      {/* Feedback & Inquiries */}
      <ContactForm />
    </>
  );
};
