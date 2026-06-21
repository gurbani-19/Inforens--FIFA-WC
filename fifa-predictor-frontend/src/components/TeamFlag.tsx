import React from 'react';

interface TeamFlagProps {
  flag: string;
  teamName: string;
  className?: string;
  style?: React.CSSProperties;
}

export const TeamFlag: React.FC<TeamFlagProps> = ({ 
  flag, 
  teamName, 
  className = "text-4xl block mb-1.5", 
  style 
}) => {
  const name = teamName?.toLowerCase() || '';
  let flagUrl = '';

  if (flag && (flag.startsWith('http://') || flag.startsWith('https://'))) {
    flagUrl = flag;
  } else {
    // Map to FlagCDN if matched
    if (name.includes('england')) {
      flagUrl = 'https://flagcdn.com/w80/gb-eng.png';
    } else if (name.includes('australia')) {
      flagUrl = 'https://flagcdn.com/w80/au.png';
    } else if (name.includes('south africa')) {
      flagUrl = 'https://flagcdn.com/w80/za.png';
    } else if (name.includes('sri lanka')) {
      flagUrl = 'https://flagcdn.com/w80/lk.png';
    } else if (name.includes('new zealand')) {
      flagUrl = 'https://flagcdn.com/w80/nz.png';
    } else if (name.includes('india')) {
      flagUrl = 'https://flagcdn.com/w80/in.png';
    } else if (name.includes('ireland')) {
      flagUrl = 'https://flagcdn.com/w80/ie.png';
    } else if (name.includes('bangladesh')) {
      flagUrl = 'https://flagcdn.com/w80/bd.png';
    } else if (name.includes('scotland')) {
      flagUrl = 'https://flagcdn.com/w80/gb-sct.png';
    } else if (name.includes('pakistan')) {
      flagUrl = 'https://flagcdn.com/w80/pk.png';
    } else if (name.includes('netherlands')) {
      flagUrl = 'https://flagcdn.com/w80/nl.png';
    } else if (name.includes('mexico')) {
      flagUrl = 'https://flagcdn.com/w80/mx.png';
    } else if (name.includes('south korea') || name.includes('korea')) {
      flagUrl = 'https://flagcdn.com/w80/kr.png';
    } else if (name.includes('czechia') || name.includes('czech')) {
      flagUrl = 'https://flagcdn.com/w80/cz.png';
    } else if (name.includes('canada')) {
      flagUrl = 'https://flagcdn.com/w80/ca.png';
    } else if (name.includes('bosnia')) {
      flagUrl = 'https://flagcdn.com/w80/ba.png';
    } else if (name.includes('united states') || name.includes('usa')) {
      flagUrl = 'https://flagcdn.com/w80/us.png';
    } else if (name.includes('paraguay')) {
      flagUrl = 'https://flagcdn.com/w80/py.png';
    } else if (name.includes('brazil')) {
      flagUrl = 'https://flagcdn.com/w80/br.png';
    } else if (name.includes('morocco')) {
      flagUrl = 'https://flagcdn.com/w80/ma.png';
    } else if (name.includes('turkey') || name.includes('türkiye')) {
      flagUrl = 'https://flagcdn.com/w80/tr.png';
    } else if (name.includes('germany')) {
      flagUrl = 'https://flagcdn.com/w80/de.png';
    } else if (name.includes('curaçao') || name.includes('curacao')) {
      flagUrl = 'https://flagcdn.com/w80/cw.png';
    } else if (name.includes('japan')) {
      flagUrl = 'https://flagcdn.com/w80/jp.png';
    } else if (name.includes('spain')) {
      flagUrl = 'https://flagcdn.com/w80/es.png';
    } else if (name.includes('cape verde')) {
      flagUrl = 'https://flagcdn.com/w80/cv.png';
    } else if (name.includes('belgium')) {
      flagUrl = 'https://flagcdn.com/w80/be.png';
    } else if (name.includes('egypt')) {
      flagUrl = 'https://flagcdn.com/w80/eg.png';
    }
  }

  if (flagUrl) {
    let dimensions = 'w-10 h-7';
    if (className.includes('text-xl')) {
      dimensions = 'w-6 h-4';
    } else if (className.includes('text-2xl')) {
      dimensions = 'w-7 h-5';
    } else if (className.includes('text-3xl')) {
      dimensions = 'w-9 h-6.5';
    } else if (className.includes('text-4xl')) {
      dimensions = 'w-12 h-8.5';
    }

    return (
      <span className={`${className} flex items-center justify-center`} style={style}>
        <img 
          src={flagUrl} 
          alt={`${teamName} flag`} 
          className={`${dimensions} object-cover rounded shadow-sm border border-orange-100/30`}
        />
      </span>
    );
  }

  // Fallback to text flag emoji
  return <span className={className} style={style}>{flag}</span>;
};
