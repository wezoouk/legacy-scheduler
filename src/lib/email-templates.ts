export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  subject: string;
  content: string;
  preview: string;
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'birthday-celebration',
    name: 'Birthday Celebration',
    category: 'Birthday',
    description: 'A warm and festive birthday message',
    subject: '🎂 Happy Birthday, [Name]!',
    preview: 'Colorful birthday wishes with party elements',
    content: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 0; border-radius: 16px; overflow: hidden;">
        <div style="text-align: center; padding: 40px 20px; color: white;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎂🎉🎈</div>
          <h1 style="font-size: 32px; font-weight: bold; margin: 0 0 8px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">Happy Birthday!</h1>
          <p style="font-size: 18px; margin: 0; opacity: 0.9;">Wishing you joy, love, and wonderful memories</p>
        </div>
        
        <div style="background: white; padding: 32px; margin: 0;">
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
            Dear [Name],
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
            On this special day, I wanted to take a moment to celebrate you and all the joy you bring to the world. 
            Your birthday is a perfect reminder of how grateful I am to have you in my life.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 24px;">
            May this new year of your life be filled with love, laughter, and all your heart's desires. 
            You deserve all the happiness in the world! 🌟
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; border-radius: 25px; font-weight: bold;">
              🎁 Celebrate Your Special Day! 🎁
            </div>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 0;">
            With love and birthday wishes,<br>
            <strong>[Your Name]</strong>
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center;">
          <p style="font-size: 12px; color: #666; margin: 0;">
            This message was sent with love through Legacy Scheduler 💝
          </p>
        </div>
      </div>
    `
  },
  {
    id: 'christmas-wishes',
    name: 'Christmas Magic',
    category: 'Christmas',
    description: 'Festive Christmas greetings with holiday spirit',
    subject: '🎄 Merry Christmas & Holiday Wishes!',
    preview: 'Warm Christmas message with festive styling',
    content: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #c41e3a 0%, #2e8b57 100%); padding: 0; border-radius: 16px; overflow: hidden;">
        <div style="text-align: center; padding: 40px 20px; color: white;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎄✨❄️</div>
          <h1 style="font-size: 32px; font-weight: bold; margin: 0 0 8px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">Merry Christmas!</h1>
          <p style="font-size: 18px; margin: 0; opacity: 0.9;">May your holidays be filled with magic and wonder</p>
        </div>
        
        <div style="background: white; padding: 32px; margin: 0;">
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
            Dear [Name],
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
            As the Christmas season fills the air with warmth and joy, I find myself thinking of you and all the 
            beautiful memories we've shared. There's something magical about this time of year that brings out 
            the best in all of us.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 24px;">
            May your Christmas be merry and bright, filled with the laughter of loved ones, the warmth of 
            cherished traditions, and the peace that comes from knowing you are deeply loved. 🎁
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #c41e3a; margin: 24px 0;">
            <p style="font-style: italic; color: #666; margin: 0; text-align: center;">
              "Christmas is not just a season, it's a feeling of warmth, love, and togetherness that lives in our hearts all year long."
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 0;">
            Wishing you and your family a Christmas filled with blessings and a New Year full of possibilities!<br><br>
            With love and holiday cheer,<br>
            <strong>[Your Name]</strong>
          </p>
        </div>
        
        <div style="background: linear-gradient(135deg, #c41e3a 0%, #2e8b57 100%); padding: 20px; text-align: center; color: white;">
          <p style="font-size: 12px; margin: 0; opacity: 0.8;">
            🎄 Sent with love through Legacy Scheduler 🎄
          </p>
        </div>
      </div>
    `
  },
  {
    id: 'anniversary-celebration',
    name: 'Anniversary Romance',
    category: 'Anniversary',
    description: 'Romantic anniversary message with elegant styling',
    subject: '💕 Happy Anniversary, My Love!',
    preview: 'Elegant romantic message for anniversaries',
    content: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%); padding: 0; border-radius: 16px; overflow: hidden;">
        <div style="text-align: center; padding: 40px 20px; color: #4a0e2b;">
          <div style="font-size: 48px; margin-bottom: 16px;">💕🌹✨</div>
          <h1 style="font-size: 32px; font-weight: bold; margin: 0 0 8px 0;">Happy Anniversary!</h1>
          <p style="font-size: 18px; margin: 0; opacity: 0.8;">Celebrating our beautiful journey together</p>
        </div>
        
        <div style="background: white; padding: 32px; margin: 0;">
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
            My Dearest [Name],
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
            Today marks another year of our incredible journey together, and my heart is overflowing with gratitude 
            for every moment we've shared. From our first hello to this very day, you have been my greatest blessing.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 24px;">
            Through all of life's seasons - the joyful celebrations and quiet tender moments - you have been 
            my constant companion, my best friend, and my truest love. Each day with you is a gift I treasure.
          </p>
          
          <div style="background: #fdf2f8; padding: 24px; border-radius: 12px; border: 2px solid #fce7f3; margin: 24px 0; text-align: center;">
            <h3 style="color: #be185d; margin: 0 0 12px 0; font-size: 20px;">Here's to Us! 🥂</h3>
            <p style="color: #333; margin: 0; font-style: italic;">
              "In all the world, there is no heart for me like yours. In all the world, there is no love for you like mine."
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 0;">
            Happy Anniversary, my love. Here's to many more years of laughter, love, and beautiful memories together! 💐<br><br>
            Forever yours,<br>
            <strong>[Your Name]</strong>
          </p>
        </div>
        
        <div style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); padding: 20px; text-align: center; color: #4a0e2b;">
          <p style="font-size: 12px; margin: 0; opacity: 0.8;">
            💕 Sent with eternal love through Legacy Scheduler 💕
          </p>
        </div>
      </div>
    `
  },
  {
    id: 'legacy-message',
    name: 'Legacy Letter',
    category: 'Legacy',
    description: 'Thoughtful legacy message for important life wisdom',
    subject: '📜 A Letter from My Heart',
    preview: 'Elegant and timeless message for sharing wisdom',
    content: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #fefefe; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); text-align: center; padding: 32px 20px; color: white;">
          <div style="font-size: 32px; margin-bottom: 12px;">📜</div>
          <h1 style="font-size: 28px; font-weight: normal; margin: 0; letter-spacing: 1px;">A Letter from My Heart</h1>
        </div>
        
        <div style="padding: 40px 32px; background: white;">
          <p style="font-size: 16px; line-height: 1.8; color: #374151; margin-bottom: 24px; font-style: italic;">
            "The best inheritance a parent can give to his children is a few minutes of their time each day." 
          </p>
          
          <p style="font-size: 16px; line-height: 1.8; color: #374151; margin-bottom: 20px;">
            My Dear [Name],
          </p>
          
          <p style="font-size: 16px; line-height: 1.8; color: #374151; margin-bottom: 20px;">
            If you're reading this, it means I wanted to share something important with you - something that couldn't wait 
            for the perfect moment because the perfect moment is now, whenever you need to hear these words.
          </p>
          
          <p style="font-size: 16px; line-height: 1.8; color: #374151; margin-bottom: 24px;">
            Throughout my life, I've learned that love isn't just about the big gestures or the special occasions. 
            It's found in the quiet moments, the everyday kindnesses, and the decision to choose each other again and again. 
            I hope you carry this understanding with you always.
          </p>
          
          <div style="background: #f9fafb; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #6b7280;">
            <h3 style="color: #374151; margin: 0 0 16px 0; font-size: 18px;">Remember Always:</h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>You are braver than you believe and stronger than you seem</li>
              <li>Every challenge is an opportunity for growth and wisdom</li>
              <li>Love generously, forgive quickly, and embrace each day fully</li>
              <li>Your dreams matter, and you have everything within you to achieve them</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; line-height: 1.8; color: #374151; margin-bottom: 0;">
            No matter where life takes you, know that you are deeply loved, believed in, and remembered with the 
            fondest of hearts. Carry these words with you, and know that love transcends all boundaries of time and space.<br><br>
            With eternal love and pride,<br>
            <strong>[Your Name]</strong>
          </p>
        </div>
        
        <div style="background: #f3f4f6; padding: 16px; text-align: center;">
          <p style="font-size: 11px; color: #6b7280; margin: 0;">
            📜 A message of love delivered through Legacy Scheduler 📜
          </p>
        </div>
      </div>
    `
  },
  {
    id: 'thank-you-gratitude',
    name: 'Heartfelt Thanks',
    category: 'Gratitude',
    description: 'Express deep gratitude and appreciation',
    subject: '🙏 Thank You for Everything',
    preview: 'Warm gratitude message with elegant styling',
    content: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); padding: 0; border-radius: 16px; overflow: hidden;">
        <div style="text-align: center; padding: 32px 20px; color: #7c2d12;">
          <div style="font-size: 42px; margin-bottom: 16px;">🙏✨💝</div>
          <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 8px 0;">Thank You</h1>
          <p style="font-size: 16px; margin: 0; opacity: 0.8;">For all the ways you've touched my life</p>
        </div>
        
        <div style="background: white; padding: 32px; margin: 0;">
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
            Dear [Name],
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
            Sometimes the most important words are the simplest ones: Thank you. But these two small words carry 
            the weight of a heart full of gratitude for all the ways you've enriched my life.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 24px;">
            Your kindness, your friendship, your presence in my world has made all the difference. Whether through 
            small daily gestures or life-changing moments of support, you've shown me what it means to be truly cared for.
          </p>
          
          <div style="background: #fff7ed; padding: 20px; border-radius: 8px; border: 2px solid #fed7aa; margin: 24px 0;">
            <p style="color: #c2410c; font-size: 16px; text-align: center; margin: 0; font-weight: 500;">
              "Gratitude makes sense of our past, brings peace for today, and creates a vision for tomorrow."
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 0;">
            Please know that your impact on my life extends far beyond what words can express. You have been a gift, 
            and I am forever grateful for you. 🌟<br><br>
            With deep appreciation and love,<br>
            <strong>[Your Name]</strong>
          </p>
        </div>
        
        <div style="background: #f97316; padding: 16px; text-align: center; color: white;">
          <p style="font-size: 12px; margin: 0; opacity: 0.9;">
            🙏 Gratitude shared through Legacy Scheduler 🙏
          </p>
        </div>
      </div>
    `
  },
  {
    id: 'graduation-pride',
    name: 'Graduation Pride',
    category: 'Achievement',
    description: 'Celebrate academic achievements and new beginnings',
    subject: '🎓 Congratulations Graduate!',
    preview: 'Celebratory graduation message with achievement theme',
    content: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 0; border-radius: 16px; overflow: hidden;">
        <div style="text-align: center; padding: 40px 20px; color: white;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎓🌟🎉</div>
          <h1 style="font-size: 32px; font-weight: bold; margin: 0 0 8px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">Congratulations!</h1>
          <p style="font-size: 18px; margin: 0; opacity: 0.9;">Your hard work and dedication have paid off</p>
        </div>
        
        <div style="background: white; padding: 32px; margin: 0;">
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
            Dear Graduate [Name],
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
            Today marks an incredible milestone in your journey, and I couldn't be more proud of your achievement! 
            Your graduation represents not just the completion of your studies, but the beginning of an exciting new chapter.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 24px;">
            The dedication, perseverance, and countless hours of hard work you've invested have led to this moment. 
            You've shown that with determination and passion, any goal is achievable. 🌟
          </p>
          
          <div style="background: #eff6ff; padding: 24px; border-radius: 12px; border: 2px solid #bfdbfe; margin: 24px 0;">
            <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 18px; text-align: center;">As You Step Forward...</h3>
            <ul style="color: #1e40af; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Trust in your abilities and the knowledge you've gained</li>
              <li>Embrace new challenges as opportunities to grow</li>
              <li>Remember that learning never ends - stay curious!</li>
              <li>Make a positive impact in whatever path you choose</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 0;">
            The world is ready for your unique talents and fresh perspective. Go forth and make your mark on the world! 
            I believe in you completely. 🚀<br><br>
            With immense pride and love,<br>
            <strong>[Your Name]</strong>
          </p>
        </div>
        
        <div style="background: #1e40af; padding: 20px; text-align: center; color: white;">
          <p style="font-size: 12px; margin: 0; opacity: 0.9;">
            🎓 Celebrating achievements through Legacy Scheduler 🎓
          </p>
        </div>
      </div>
    `
  },
  {
    id: 'new-baby-joy',
    name: 'New Baby Joy',
    category: 'New Baby',
    description: 'Welcoming a new little one with love and excitement',
    subject: '👶 Welcome to the World, Little One!',
    preview: 'Adorable welcome message for new babies',
    content: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #fde68a 0%, #f9d71c 50%, #fde68a 100%); padding: 0; border-radius: 16px; overflow: hidden;">
        <div style="text-align: center; padding: 32px 20px; color: #451a03;">
          <div style="font-size: 42px; margin-bottom: 16px;">👶🌟💛</div>
          <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 8px 0;">Welcome Little One!</h1>
          <p style="font-size: 16px; margin: 0; opacity: 0.8;">A new beautiful life has begun</p>
        </div>
        
        <div style="background: white; padding: 32px; margin: 0;">
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
            Dear New Parents & Sweet Baby [Name],
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
            What a joyous day this is! A precious new life has entered our world, bringing with them infinite 
            possibilities, boundless love, and the promise of wonderful tomorrows.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 24px;">
            To the newest little member of our family/circle: Welcome to this beautiful world! You are already 
            so deeply loved, and your journey is just beginning. May your life be filled with wonder, laughter, 
            discovery, and endless adventures. 🌈
          </p>
          
          <div style="background: #fefce8; padding: 20px; border-radius: 12px; border: 2px solid #fde047; margin: 24px 0;">
            <h3 style="color: #a16207; margin: 0 0 12px 0; font-size: 18px; text-align: center;">Sweet Dreams & Big Dreams 💭</h3>
            <p style="color: #a16207; text-align: center; margin: 0; font-style: italic;">
              "A baby is something you carry inside you for nine months, in your arms for three years, 
              and in your heart until the day you die."
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 0;">
            To the proud parents: Congratulations on this incredible blessing! May your home be filled with 
            baby giggles, peaceful nights, and hearts overflowing with love. 💕<br><br>
            With love and best wishes,<br>
            <strong>[Your Name]</strong>
          </p>
        </div>
        
        <div style="background: #f59e0b; padding: 16px; text-align: center; color: white;">
          <p style="font-size: 12px; margin: 0; opacity: 0.9;">
            👶 Celebrating new life through Legacy Scheduler 👶
          </p>
        </div>
      </div>
    `
  },
  {
    id: 'encouragement-strength',
    name: 'Words of Strength',
    category: 'Encouragement',
    description: 'Uplifting message for difficult times',
    subject: '💪 You Are Stronger Than You Know',
    preview: 'Encouraging message to provide strength and hope',
    content: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); padding: 0; border-radius: 16px; overflow: hidden;">
        <div style="text-align: center; padding: 32px 20px; color: white;">
          <div style="font-size: 42px; margin-bottom: 16px;">💪🌟⭐</div>
          <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 8px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">You Are Stronger</h1>
          <p style="font-size: 16px; margin: 0; opacity: 0.9;">Than you know, braver than you feel</p>
        </div>
        
        <div style="background: white; padding: 32px; margin: 0;">
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
            Dear [Name],
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
            Life has a way of testing us when we least expect it, and sometimes the challenges can feel overwhelming. 
            But I want you to know something important: you have an incredible strength within you, even when you can't feel it.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 24px;">
            Every storm you've weathered, every obstacle you've overcome, every time you've gotten back up - 
            these are proof of your resilience. You are not alone in this journey, and you are capable of so much more than you realize.
          </p>
          
          <div style="background: #f0f9ff; padding: 24px; border-radius: 12px; border: 2px solid #bae6fd; margin: 24px 0;">
            <h3 style="color: #0369a1; margin: 0 0 16px 0; font-size: 18px; text-align: center;">Remember This Truth 💎</h3>
            <p style="color: #0369a1; text-align: center; margin: 0; font-size: 16px; font-weight: 500;">
              "The most beautiful people I've known are those who have known trials, known struggles, known loss, 
              and have found their way out of the depths. They have a beauty, an appreciation, and a depth that fills the heart."
            </p>
          </div>
          
          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #065f46; margin: 0 0 12px 0;">You Have:</h4>
            <ul style="color: #065f46; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>Survived 100% of your difficult days so far</li>
              <li>The power to choose hope over fear</li>
              <li>People who believe in you (including me!)</li>
              <li>Unlimited potential for tomorrow</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 0;">
            Take it one day at a time, one step at a time, one breath at a time. You don't have to be perfect - 
            you just have to keep going. I believe in you completely. 🌈<br><br>
            Sending you strength and love,<br>
            <strong>[Your Name]</strong>
          </p>
        </div>
        
        <div style="background: #0369a1; padding: 16px; text-align: center; color: white;">
          <p style="font-size: 12px; margin: 0; opacity: 0.9;">
            💪 Strength shared through Legacy Scheduler 💪
          </p>
        </div>
      </div>
    `
  },
  {
    id: 'farewell-love',
    name: 'Until We Meet Again',
    category: 'Farewell',
    description: 'A gentle farewell message filled with love',
    subject: '💝 Until We Meet Again',
    preview: 'Loving farewell message with comfort and hope',
    content: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); padding: 0; border-radius: 16px; overflow: hidden;">
        <div style="text-align: center; padding: 32px 20px; color: #312e81;">
          <div style="font-size: 42px; margin-bottom: 16px;">💝🕊️✨</div>
          <h1 style="font-size: 28px; font-weight: normal; margin: 0 0 8px 0; letter-spacing: 1px;">Until We Meet Again</h1>
          <p style="font-size: 16px; margin: 0; opacity: 0.8;">Love never truly says goodbye</p>
        </div>
        
        <div style="background: white; padding: 40px 32px; margin: 0;">
          <p style="font-size: 16px; line-height: 1.8; color: #374151; margin-bottom: 24px; font-style: italic; text-align: center;">
            "Death is not the opposite of life, but a part of it." - Haruki Murakami
          </p>
          
          <p style="font-size: 16px; line-height: 1.8; color: #374151; margin-bottom: 20px;">
            My Beloved [Name],
          </p>
          
          <p style="font-size: 16px; line-height: 1.8; color: #374151; margin-bottom: 20px;">
            If you're reading this, it means I wanted to share some final thoughts with you - not because I'm gone, 
            but because love compels us to reach across any distance, even time itself, to touch the hearts we cherish most.
          </p>
          
          <p style="font-size: 16px; line-height: 1.8; color: #374151; margin-bottom: 24px;">
            Please don't think of this as goodbye. Think of it as "see you later," because love like ours doesn't end - 
            it transforms, it transcends, it continues in all the ways you carry me in your heart and I carry you in mine.
          </p>
          
          <div style="background: #f0f9ff; padding: 24px; border-radius: 12px; border-left: 4px solid #3b82f6; margin: 24px 0;">
            <h3 style="color: #1e40af; margin: 0 0 16px 0; font-size: 18px;">What I Want You to Remember:</h3>
            <ul style="color: #1e40af; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>You are loved beyond measure, always and forever</li>
              <li>Every moment we shared was a gift I treasured</li>
              <li>Your happiness was always my greatest joy</li>
              <li>I am at peace, and I want the same for you</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; line-height: 1.8; color: #374151; margin-bottom: 20px;">
            Live fully, love deeply, and remember that I am always with you in the sunrise you watch, 
            the music that moves you, the laughter that fills your days, and the quiet moments when you feel my presence.
          </p>
          
          <p style="font-size: 16px; line-height: 1.8; color: #374151; margin-bottom: 0;">
            This is not the end of our story - it's just the beginning of a new chapter where love continues 
            in all its beautiful, eternal forms. 🌅<br><br>
            Until we meet again, with all my love,<br>
            <strong>[Your Name]</strong>
          </p>
        </div>
        
        <div style="background: #312e81; padding: 20px; text-align: center; color: white;">
          <p style="font-size: 12px; margin: 0; opacity: 0.8;">
            💝 Love transcends through Legacy Scheduler 💝
          </p>
        </div>
      </div>
    `
  }
];

export function getTemplatesByCategory() {
  const categories = [...new Set(emailTemplates.map(t => t.category))];
  return categories.reduce((acc, category) => {
    acc[category] = emailTemplates.filter(t => t.category === category);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);
}

export function getTemplateById(id: string): EmailTemplate | undefined {
  return emailTemplates.find(t => t.id === id);
}