# Student Dashboard Design Specification

## 🎯 **Project Overview**
Design a beautiful, dark-themed Islamic-inspired Student Dashboard for an online Quranic learning platform. The design should evoke the elegance of traditional Quran manuscripts while maintaining modern UI/UX principles.

---

## 📐 **Design System**

### **Color Palette**

#### **Primary Colors**
- **White (Primary Background)**: `#ffffff` (Pure white)
- **Light Gray (Secondary Background)**: `#f8fafb` (Slate-50)
- **Subtle Gray (Tertiary)**: `#f3f4f6` (Gray-100)

#### **Accent Colors**
- **Teal/Green (Primary Accent)**: `#0d9488` (Teal-600)
- **Lighter Teal (Secondary Accent)**: `#14b8a6` (Teal-500)
- **Light Teal**: `#ccfbf1` (Teal-100)

#### **Status Colors**
- **Blue (Classes/Info)**: `#2563eb` (Blue-600)
- **Green (Learning Hours)**: `#10b981` (Emerald-500)
- **Purple (Live Sessions)**: `#8b5cf6` (Violet-500)
- **Orange (Reels/Videos)**: `#f97316` (Orange-500)

#### **Text Colors**
- **Primary Text**: `#1f2937` (Gray-800)
- **Secondary Text**: `#6b7280` (Gray-500)
- **Tertiary Text**: `#9ca3af` (Gray-400)
- **Muted Text**: `#d1d5db` (Gray-300)

#### **Borders & Shadows**
- **Subtle Border**: `rgba(13, 148, 136, 0.15)` (Teal at 15% opacity)
- **Visible Border**: `rgba(13, 148, 136, 0.3)` (Teal at 30% opacity)
- **Hover Border**: `rgba(13, 148, 136, 0.4)` (Teal at 40% opacity)
- **Shadow**: `rgba(13, 148, 136, 0.1)` (Ambient)

---

## 🔤 **Typography**

### **Font Family**
- **Arabic Text**: "Traditional Arabic" (serif, traditional look)
- **English Text**: "Inter" or "Segoe UI" (modern clean sans-serif)
- **Fallback**: System fonts

### **Font Sizes & Weights**
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page Title | 48px | Bold (700) | Gray-900 |
| Section Header | 32px | Bold (700) | Gray-800 |
| Subsection Title | 24px | Semibold (600) | Gray-800 |
| Card Title | 20px | Semibold (600) | Gray-800 |
| Body Text | 16px | Regular (400) | Gray-700 |
| Small Text | 14px | Regular (400) | Gray-600 |
| Button Text | 16px | Semibold (600) | White/Teal |
| Label | 12px | Semibold (600) | Gray-600 |

---

## 🎨 **Layout Structure**

### **Main Container**
- **Type**: Full-screen light background
- **Background**: `#ffffff` (Pure white) or gradient from `#ffffff` to `#f8fafb` (very subtle)
- **Padding**: 32px on desktop, 16px on mobile
- **Max Width**: 1280px (centered)
- **Spacing**: 8px grid system

### **Responsive Breakpoints**
- **Mobile**: 0-640px (1-column layout)
- **Tablet**: 641-1024px (2-column layout)
- **Desktop**: 1025px+ (5-column layout)

---

## 🏠 **Header Section** (Top Area)

### **Background**
- **Type**: Light gradient box
- **Background**: `#ffffff` (White) with subtle top border
- **Border**: 1px solid `rgba(13, 148, 136, 0.2)` (Teal subtle, bottom only)
- **Border Radius**: 12px
- **Padding**: 32px
- **Backdrop Filter**: None (light theme)
- **Shadow**: Subtle shadow `0 4px 12px rgba(0, 0, 0, 0.05)`

### **Ornamental Elements**
- **Top Ornament**: Decorative symbol "❦" at top center
  - Color: `rgba(13, 148, 136, 0.15)` (Teal at 15%)
  - Size: 48px
  - Position: Absolute, centered top
- **Background Ornament**: "✦" in top right corner
  - Color: `rgba(13, 148, 136, 0.08)` (Teal at 8%)
  - Size: 128px
  - Position: Absolute, top right
  - Opacity: Very subtle

### **Header Content - Left Section**

#### **Arabic Welcome Text**
- **Text**: "أهلا وسهلا"
- **Font**: Traditional Arabic
- **Size**: 48px
- **Weight**: Bold (700)
- **Color**: `#0d9488` (Teal-600)
- **Letter Spacing**: 2px
- **Margin Bottom**: 16px

#### **Student Name**
- **Format**: "Assalamu Alaikum, [Student Name]"
- **Size**: 18px
- **Color**: `#0d9488` (Teal-600)
- **Weight**: Medium (500)
- **Margin Bottom**: 8px

#### **Welcome Description**
- **Text**: Bilingual welcome message
- **Arabic**: "مرحبا بعودتك إلى رحلة التعلم"
- **English**: "Welcome back to your learning journey"
- **Size**: 14px
- **Color**: `#6b7280` (Gray-500)
- **Weight**: Regular (400)
- **Line Height**: 1.6

### **Header Content - Right Section**

#### **"Open Muṣḥaf" Button**
- **Type**: Primary CTA Button
- **Text**: "📖 Open Muṣḥaf"
- **Background**: Gradient from `#0d9488` to `#14b8a6` (Teal gradient)
- **Hover Background**: Gradient from `#0d9488` (darker) to `#0d9488`
- **Text Color**: White
- **Padding**: 16px 32px
- **Border Radius**: 8px
- **Font Size**: 16px
- **Font Weight**: Semibold (600)
- **Shadow**: `0 10px 25px rgba(13, 148, 136, 0.2)` (Teal shadow on hover)
- **Transition**: All 300ms ease
- **Cursor**: Pointer
- **Icon Size**: 24px
- **Icon Margin Right**: 8px

---

## 📊 **Statistics Grid** (Quick Stats)

### **Grid Layout**
- **Type**: 4-column grid on desktop, 2-column on tablet, 1-column on mobile
- **Gap**: 16px
- **Margin Top**: 32px
- **Margin Bottom**: 32px

### **Stat Card** (4 Cards Total)

#### **Card Structure**
Each stat card displays: Icon | Number | Label

#### **Stat 1: Enrolled Classes**
- **Icon**: 📚 (Book icon)
- **Color**: Blue gradient
- **Number**: [Dynamic from API]
- **Label**: "Enrolled Classes"
- **Arabic Label**: "الفصول المسجلة"

#### **Stat 2: Live Sessions**
- **Icon**: 🎥 (Video icon)
- **Color**: Purple gradient
- **Number**: [Dynamic from API]
- **Label**: "Live Sessions"
- **Arabic Label**: "الجلسات المباشرة"

#### **Stat 3: Reels Watched**
- **Icon**: 🎬 (Film icon)
- **Color**: Orange gradient
- **Number**: [Dynamic from API]
- **Label**: "Reels"
- **Arabic Label**: "المقاطع"

#### **Stat 4: Learning Hours**
- **Icon**: ⏱️ (Clock icon)
- **Color**: Green gradient
- **Number**: [Dynamic from API]
- **Label**: "Learning Hours"
- **Arabic Label**: "ساعات التعلم"

### **Card Styling**
- **Background**: `#ffffff` (White)
- **Border**: 1px solid `rgba(13, 148, 136, 0.2)` (Teal subtle)
- **Border Radius**: 12px
- **Padding**: 24px
- **Backdrop Filter**: None
- **Transition**: All 300ms ease
- **Shadow**: `0 2px 8px rgba(0, 0, 0, 0.05)` (Subtle light shadow)

### **Card Hover State**
- **Border**: 1px solid `rgba(13, 148, 136, 0.35)` (More visible)
- **Shadow**: `0 12px 24px rgba(13, 148, 136, 0.1)` (Teal glow)
- **Scale**: 1.02x
- **Transform**: Slight lift effect

### **Card Content**
- **Icon Size**: 32px
- **Icon Color**: Depends on stat color (blue/green/purple/orange)
- **Icon Margin Bottom**: 12px
- **Number Font Size**: 32px
- **Number Weight**: Bold (700)
- **Number Color**: `#0d9488` (Teal-600)
- **Number Margin Bottom**: 8px
- **Label Font Size**: 14px
- **Label Color**: `#6b7280` (Gray-500)
- **Arabic Label**: 12px, `#9ca3af` (Gray-400), below English label

---

## 🔀 **Horizontal Divider**

- **Type**: Line with ornament
- **Height**: 1px
- **Background**: `rgba(13, 148, 136, 0.15)` (Teal subtle)
- **Margin**: 32px 0
- **Ornament**: "✦" centered on the line
- **Ornament Background**: White circle
- **Ornament Color**: `#0d9488` (Teal-600)
- **Ornament Size**: 24px

---

## 📱 **Main Content Area**

### **Layout**
- **Type**: Two-part layout on desktop, stacked on mobile
- **Left Sidebar**: 20% width (fixed on desktop, collapsible on mobile)
- **Right Content**: 80% width
- **Gap**: 32px
- **Responsive**: Stack vertically below 1024px

### **Left Sidebar - Navigation**

#### **Section Title**
- **Text**: "Navigation" / "القائمة"
- **Size**: 14px
- **Weight**: Semibold (600)
- **Color**: Slate-300
- **Text Transform**: Uppercase
- **Letter Spacing**: 1.5px
- **Margin Bottom**: 16px

#### **Navigation Tabs** (3 Buttons)

Each button shows:
1. **Icon** (left side)
2. **English Label** (center)
3. **Active Indicator Dot** (right side when active)

##### **Tab 1: Classes**
- **Icon**: 📖 (Book icon)
- **Label**: "Classes"
- **Arabic**: "الفصول"
- **Order**: First tab

##### **Tab 2: Reels**
- **Icon**: 🎬 (Film icon)
- **Label**: "Reels"
- **Arabic**: "المقاطع"
- **Order**: Second tab

##### **Tab 3: Live Sessions**
- **Icon**: 🎥 (Video icon)
- **Label**: "Live Sessions"
- **Arabic**: "الجلسات المباشرة"
- **Order**: Third tab

#### **Tab Styling**

**Inactive State:**
- **Background**: `#f3f4f6` (Gray-100)
- **Border**: 1px solid `rgba(13, 148, 136, 0.1)` (Teal at 10%)
- **Text Color**: `#6b7280` (Gray-500)
- **Padding**: 12px 16px
- **Margin Bottom**: 8px
- **Border Radius**: 8px
- **Transition**: All 300ms ease

**Active State:**
- **Background**: `#ccfbf1` (Teal-100)
- **Border**: 2px solid `#0d9488` (Teal visible)
- **Text Color**: `#0d9488` (Teal-600)
- **Indicator Dot**: 8px circle, Teal-600, right side
- **Pulse Animation**: Subtle glow effect on dot

**Hover State:**
- **Background**: `#e5f8f6` (Lighter teal)
- **Border**: Increase to 30% opacity
- **Transition**: 200ms ease

---

## 📄 **Right Content Area**

### **Content Header** (Per Tab)

#### **Header Layout**
- **Type**: Flex row, space-between
- **Padding**: 24px (bottom border only)
- **Border Bottom**: 1px solid `rgba(13, 148, 136, 0.15)` (Teal subtle)
- **Margin Bottom**: 24px

#### **Left Part - Title**
- **Size**: 28px
- **Weight**: Bold (700)
- **Color**: `#1f2937` (Gray-800)
- **Format**: [Tab Name] (e.g., "My Classes", "My Reels", "Live Sessions")

#### **Right Part - Action Button**
- **Classes Tab**: "Join New Class" button
- **Reels Tab**: "Browse More" button
- **Sessions Tab**: "View All Sessions" button

**Button Styling:**
- **Background**: `#0d9488` (Teal-600)
- **Hover Background**: `#0d9488` (darker teal)
- **Text Color**: White
- **Padding**: 8px 16px
- **Border Radius**: 6px
- **Font Size**: 14px
- **Font Weight**: Semibold (600)
- **Border**: None
- **Shadow**: Subtle teal glow on hover
- **Transition**: All 300ms ease

---

## 🎴 **Content Cards Grid**

### **Grid Layout**
- **Classes Tab**: 3-column grid on desktop, 2-column on tablet, 1-column on mobile
- **Reels Tab**: Same as Classes
- **Sessions Tab**: 3-column grid
- **Gap**: 24px
- **Responsive**: Adjust columns based on viewport

### **CLASS CARD Design**

#### **Card Wrapper**
- **Background**: `#ffffff` (White)
- **Border**: 1px solid `rgba(13, 148, 136, 0.15)` (Teal subtle)
- **Border Radius**: 12px
- **Overflow**: Hidden (so image stays within border)
- **Padding**: 0 (No padding, use padding in sections)
- **Transition**: All 300ms ease
- **Cursor**: Pointer

#### **Hover State**
- **Border**: 1px solid `rgba(13, 148, 136, 0.35)` (More visible)
- **Shadow**: `0 12px 24px rgba(13, 148, 136, 0.15)` (Teal glow)
- **Transform**: translateY(-4px) (Slight lift)

#### **Card Header Section** (Top 120px)
- **Background**: Gradient specific to class color
  - **Default**: Blue to darker blue
  - **Class 2**: Purple to darker purple
  - **Class 3**: Orange to darker orange
- **Padding**: 24px
- **Position**: Relative (for ornament overlay)
- **Min Height**: 120px
- **Display**: Flex, flex-direction: column, justify-content: space-between

##### **Header Ornament**
- **Content**: "✦"
- **Position**: Absolute, top-right corner
- **Size**: 48px
- **Color**: White at 10% opacity
- **Z-index**: 1

##### **Class Code/Identifier** (Optional)
- **Position**: Top-left of header
- **Size**: 12px
- **Weight**: Semibold (600)
- **Color**: White at 70% opacity
- **Background**: Rgba(0, 0, 0, 0.3)
- **Padding**: 4px 8px
- **Border Radius**: 4px

##### **Class Title**
- **Size**: 20px
- **Weight**: Bold (700)
- **Color**: White
- **Position**: Absolute, bottom-left
- **Margin**: 24px
- **Max Width**: 80%
- **Text Overflow**: Ellipsis, single line

#### **Card Body Section** (Middle)
- **Padding**: 20px
- **Background**: `#f9fafb` (Gray-50)

##### **Class Description**
- **Size**: 14px
- **Weight**: Regular (400)
- **Color**: `#6b7280` (Gray-500)
- **Line Height**: 1.5
- **Margin Bottom**: 16px
- **Max Lines**: 2 (ellipsis if overflow)

##### **Class Meta Info** (Horizontal layout)
- **Type**: Flex row, gap 8px
- **Display**: Flex items separated by dots

**Info Item 1: Member Count**
- **Icon**: 👥
- **Text**: "[Number] members"
- **Color**: `#9ca3af` (Gray-400)
- **Size**: 12px

**Info Item 2: Schedule**
- **Icon**: 🕐
- **Text**: "[Day] [Time]"
- **Color**: `#9ca3af` (Gray-400)
- **Size**: 12px

**Info Item 3: Instructor** (Optional)
- **Icon**: 👨‍🏫
- **Text**: "[Instructor Name]"
- **Color**: `#9ca3af` (Gray-400)
- **Size**: 12px

#### **Card Footer Section** (Bottom)
- **Padding**: 16px 20px
- **Background**: `#ffffff` (White)
- **Border Top**: 1px solid `rgba(13, 148, 136, 0.1)`
- **Display**: Flex, justify-content: space-between, align-items: center

##### **Arabic Class Name** (Right side)
- **Font**: Traditional Arabic
- **Size**: 16px
- **Weight**: Semibold (600)
- **Color**: `#0d9488` (Teal-600)
- **Direction**: RTL (right-to-left)
- **Margin Right**: 8px

##### **Status Badge** (Optional)
- **Format**: "[Status]" (e.g., "Active", "Pending")
- **Background**: Color varies by status
  - Active: `rgba(16, 185, 129, 0.1)` (Green light)
  - Pending: `rgba(13, 148, 136, 0.1)` (Teal light)
- **Color**: Green-600 or Teal-600
- **Size**: 12px
- **Padding**: 4px 8px
- **Border Radius**: 4px
- **Border**: 1px solid matching color

---

### **SESSION CARD Design**

#### **Card Layout** (Horizontal or Vertical)
- **Background**: `#ffffff` (White)
- **Border**: 1px solid `rgba(13, 148, 136, 0.15)` (Teal subtle)
- **Border Radius**: 12px
- **Padding**: 24px
- **Transition**: All 300ms ease
- **Cursor**: Pointer

#### **Hover State**
- **Border**: 1px solid `rgba(13, 148, 136, 0.35)` (More visible)
- **Shadow**: `0 12px 24px rgba(13, 148, 136, 0.15)` (Teal glow)
- **Transform**: translateY(-4px)

#### **Session Header** (Top)
- **Display**: Flex, justify-content: space-between, align-items: flex-start
- **Margin Bottom**: 16px

##### **Session Title (Left)**
- **Size**: 20px
- **Weight**: Bold (700)
- **Color**: `#1f2937` (Gray-800)
- **Max Width**: 70%

##### **Status Badge (Right)**
- **Format**: "LIVE" or "UPCOMING"
- **Live Badge**:
  - **Background**: `rgba(239, 68, 68, 0.1)` (Red at 10%)
  - **Border**: 1px solid `rgba(239, 68, 68, 0.3)`
  - **Color**: Red-600 (#dc2626)
  - **Pulse Animation**: Subtle breathing effect
- **Upcoming Badge**:
  - **Background**: `rgba(13, 148, 136, 0.1)` (Teal at 10%)
  - **Border**: 1px solid `rgba(13, 148, 136, 0.3)`
  - **Color**: Teal-600

#### **Session Meta Information** (Middle)
- **Display**: Flex, flex-direction: column, gap 8px
- **Margin Bottom**: 16px

##### **Meta Item Layout** (Each line)
- **Display**: Flex, align-items: center, gap 8px
- **Font Size**: 14px
- **Color**: `#6b7280` (Gray-500)
- **Weight**: Regular (400)

**Item 1: Time & Date**
- **Icon**: 🕐
- **Format**: "[Date] at [Time]"

**Item 2: Duration**
- **Icon**: ⏱️
- **Format**: "[Duration] minutes"

**Item 3: Instructor**
- **Icon**: 👨‍🏫
- **Format**: "with [Instructor Name]"

**Item 4: Participant Count**
- **Icon**: 👥
- **Format**: "[Count] participants"

#### **Session Description** (Optional)
- **Size**: 13px
- **Color**: `#9ca3af` (Gray-400)
- **Line Height**: 1.5
- **Margin Bottom**: 16px
- **Max Lines**: 2 (ellipsis)

#### **Session Footer** (Bottom)
- **Display**: Flex, justify-content: space-between

##### **Left - Join/Watch Button**
- **Text**: "Join Now" (if upcoming) or "Watch Now" (if live)
- **Background**: `#0d9488` (Teal-600)
- **Hover**: `#0d9488` (darker teal)
- **Text Color**: White
- **Padding**: 8px 16px
- **Border Radius**: 6px
- **Font Weight**: Semibold (600)
- **Font Size**: 14px

##### **Right - Share Button**
- **Icon**: 🔗 (Share)
- **Background**: Transparent
- **Border**: 1px solid `rgba(13, 148, 136, 0.3)` (Teal subtle)
- **Color**: `#0d9488` (Teal-600)
- **Padding**: 8px 12px
- **Border Radius**: 6px
- **Hover**: Border becomes 50% opacity

---

### **REEL CARD Design**

#### **Card Wrapper**
- **Background**: `#ffffff` (White)
- **Border**: 1px solid `rgba(13, 148, 136, 0.15)` (Teal subtle)
- **Border Radius**: 12px
- **Overflow**: Hidden
- **Aspect Ratio**: 9:16 (Portrait video format)
- **Transition**: All 300ms ease
- **Cursor**: Pointer

#### **Card Hover State**
- **Border**: 1px solid `rgba(13, 148, 136, 0.35)` (More visible)
- **Shadow**: `0 12px 24px rgba(13, 148, 136, 0.15)` (Teal glow)
- **Transform**: scale(1.02)

#### **Thumbnail Section** (Top 70%)
- **Background**: Light gray (placeholder image area)
- **Background Image**: [Video thumbnail URL]
- **Background Size**: Cover
- **Background Position**: Center
- **Height**: 70% of card
- **Position**: Relative

##### **Play Button Overlay**
- **Position**: Absolute, centered
- **Size**: 56px diameter
- **Background**: `rgba(13, 148, 136, 0.8)` (Teal with transparency)
- **Border**: 2px solid `#0d9488` (Teal-600)
- **Border Radius**: 50%
- **Icon**: ▶ (Play icon)
- **Icon Color**: White
- **Icon Size**: 24px
- **Opacity**: 100% on hover
- **Transition**: All 300ms ease
- **Initial State**: Opacity 80% at rest

##### **Duration Badge**
- **Position**: Absolute, bottom-right
- **Background**: `rgba(0, 0, 0, 0.6)` (Dark overlay)
- **Padding**: 4px 8px
- **Border Radius**: 4px
- **Text**: "[MM:SS]"
- **Color**: White
- **Size**: 12px
- **Weight**: Semibold (600)

#### **Reel Information Section** (Bottom 30%)
- **Background**: `#f9fafb` (Gray-50)
- **Padding**: 16px
- **Height**: 30% of card
- **Display**: Flex, flex-direction: column, justify-content: space-between

##### **Title & Description**
- **Title Size**: 16px
- **Title Weight**: Bold (700)
- **Title Color**: `#1f2937` (Gray-800)
- **Title Margin Bottom**: 4px
- **Description Size**: 12px
- **Description Color**: `#9ca3af` (Gray-400)
- **Description Weight**: Regular (400)
- **Max Lines**: 1 for title, 1 for description (ellipsis if overflow)

##### **Engagement Stats** (Bottom)
- **Display**: Flex, justify-content: space-between, gap 4px
- **Height**: 24px
- **Align Items**: Center

**Stat 1: Likes**
- **Icon**: ❤️
- **Value**: "[Count]"
- **Size**: 12px
- **Color**: `#9ca3af` (Gray-400)

**Stat 2: Comments**
- **Icon**: 💬
- **Value**: "[Count]"
- **Size**: 12px
- **Color**: `#9ca3af` (Gray-400)

**Stat 3: Views**
- **Icon**: 👁️
- **Value**: "[Count]"
- **Size**: 12px
- **Color**: `#9ca3af` (Gray-400)

---

## 🚫 **Empty State Design**

### **Scenario**: No cards in a tab

#### **Container**
- **Background**: `#f3f4f6` (Gray-100)
- **Border**: 1px dashed `rgba(13, 148, 136, 0.2)` (Teal subtle)
- **Border Radius**: 12px
- **Padding**: 64px 32px
- **Text Align**: Center
- **Backdrop Filter**: None

#### **Empty State Content**
- **Display**: Flex, flex-direction: column, align-items: center, gap 16px

##### **Icon**
- **Size**: 80px
- **Color**: `rgba(13, 148, 136, 0.2)` (Teal at 20%)
- **Icon Type**: Varies by tab (e.g., 📚 for no classes, 🎬 for no reels)

##### **Title**
- **Size**: 20px
- **Weight**: Bold (700)
- **Color**: `#1f2937` (Gray-800)
- **Text**: "No [Tab Name] Yet"
- **Margin Bottom**: 8px

##### **Description**
- **Size**: 14px
- **Weight**: Regular (400)
- **Color**: `#9ca3af` (Gray-400)
- **Text**: Descriptive message (e.g., "Join a class to get started")
- **Max Width**: 300px

##### **Action Button** (Optional)
- **Text**: "Browse Available" or "Get Started"
- **Background**: `#0d9488` (Teal-600)
- **Hover**: `#0d9488` (darker teal)
- **Text Color**: White
- **Padding**: 10px 20px
- **Border Radius**: 6px
- **Margin Top**: 8px

---

## 📋 **Modal/Dialog Design** (Join Class Modal)

### **Modal Backdrop**
- **Background**: `rgba(0, 0, 0, 0.5)` (Black with transparency - lighter for light theme)
- **Backdrop Filter**: Blur 4px
- **Animation**: Fade in 300ms ease

### **Modal Container**
- **Width**: 500px on desktop, 90% on mobile
- **Max Width**: 600px
- **Background**: `#ffffff` (White)
- **Border**: 1px solid `rgba(13, 148, 136, 0.2)` (Teal subtle)
- **Border Radius**: 12px
- **Padding**: 32px
- **Shadow**: `0 25px 50px rgba(0, 0, 0, 0.1)` (Light shadow)
- **Position**: Centered on screen
- **Animation**: Scale up 300ms ease-out from 0.95 to 1

### **Modal Header**
- **Margin Bottom**: 24px
- **Display**: Flex, justify-content: space-between, align-items: center

#### **Title**
- **Size**: 24px
- **Weight**: Bold (700)
- **Color**: `#1f2937` (Gray-800)
- **Text**: "Join Class"

#### **Close Button**
- **Icon**: ✕ (X icon)
- **Background**: Transparent
- **Color**: `#9ca3af` (Gray-400)
- **Size**: 24px
- **Padding**: 8px
- **Border Radius**: 4px
- **Hover Background**: `rgba(13, 148, 136, 0.1)` (Teal light)
- **Hover Color**: `#0d9488` (Teal-600)
- **Cursor**: Pointer

### **Modal Form Content**

#### **Form Fields**
Each input follows this pattern:

**Label**
- **Size**: 14px
- **Weight**: Semibold (600)
- **Color**: `#6b7280` (Gray-500)
- **Margin Bottom**: 8px

**Input Field**
- **Background**: `#f3f4f6` (Gray-100)
- **Border**: 1px solid `rgba(13, 148, 136, 0.2)` (Teal subtle)
- **Border Radius**: 6px
- **Padding**: 12px 16px
- **Color**: `#1f2937` (Gray-800)
- **Font Size**: 14px
- **Placeholder Color**: `#d1d5db` (Gray-300)
- **Transition**: All 300ms ease
- **Focus State**: 
  - **Border**: 1px solid `rgba(13, 148, 136, 0.5)` (Teal visible)
  - **Box Shadow**: `0 0 0 3px rgba(13, 148, 136, 0.1)`
- **Margin Bottom**: 16px

#### **Form Fields Example:**
1. **Class Code**: Text input
2. **Student ID**: Text input (optional)
3. **Join Reason**: Textarea

### **Modal Footer**
- **Margin Top**: 24px
- **Display**: Flex, gap 12px, justify-content: flex-end

#### **Cancel Button**
- **Text**: "Cancel"
- **Background**: `#f3f4f6` (Gray-100)
- **Border**: 1px solid `rgba(13, 148, 136, 0.2)` (Teal subtle)
- **Color**: `#6b7280` (Gray-500)
- **Padding**: 10px 24px
- **Border Radius**: 6px
- **Hover Background**: `#e5f8f6` (Teal light)
- **Transition**: All 300ms ease

#### **Join Button** (Primary CTA)
- **Text**: "Join Class"
- **Background**: `#0d9488` (Teal-600)
- **Color**: White
- **Padding**: 10px 24px
- **Border Radius**: 6px
- **Font Weight**: Semibold (600)
- **Hover Background**: `#0d9488` (darker teal)
- **Shadow**: `0 10px 20px rgba(13, 148, 136, 0.2)` on hover
- **Transition**: All 300ms ease

---

## 🎬 **Animations & Interactions**

### **Global Transitions**
- **Standard Duration**: 300ms
- **Easing**: ease (or ease-in-out for more complex animations)
- **Properties**: All (applies to background, border, shadow, transform)

### **Hover Effects**
- **Cards**: `translateY(-4px)` with shadow enhancement
- **Buttons**: Background color shift + shadow glow
- **Text Links**: Color change + underline expansion

### **Active States**
- **Tab Buttons**: Amber border + indicator dot with pulse
- **Cards**: Increased border visibility + enhanced shadow

### **Animations**
1. **Pulse Animation** (for Live session badge):
   - Duration: 2s
   - Iteration: Infinite
   - Effect: Opacity 0.8 → 1 → 0.8

2. **Fade In** (page load):
   - Duration: 400ms
   - From: Opacity 0
   - To: Opacity 1

3. **Slide Up** (card appearance):
   - Duration: 400ms
   - From: translateY(20px), Opacity 0
   - To: translateY(0), Opacity 1

---

## 📐 **Spacing System** (8px Grid)

| Unit | Value | Usage |
|------|-------|-------|
| xs | 4px | Micro spacing |
| sm | 8px | Small gaps |
| md | 16px | Standard padding |
| lg | 24px | Card padding, section gaps |
| xl | 32px | Large section spacing |
| 2xl | 64px | Major section gaps |

---

## 🔧 **Implementation Notes**

### **Key Design Features**
✅ Light/white theme for modern, clean aesthetic
✅ Teal/green accents for freshness and growth
✅ Bilingual support (English + Arabic)
✅ Responsive grid layout (4→3→2→1 columns)
✅ Subtle animations and transitions
✅ Ornamental Islamic design elements
✅ Soft shadow effects for depth (light theme)
✅ Consistent border and shadow styling
✅ Status indicators with appropriate colors
✅ Clear visual hierarchy with typography

### **Accessibility Considerations**
- ✅ High contrast ratios (white text on dark backgrounds)
- ✅ Clear focus states on interactive elements
- ✅ Readable font sizes (minimum 14px for body text)
- ✅ Clear error and success messages
- ✅ Semantic HTML structure

### **Performance**
- Use CSS Grid/Flexbox (not floats)
- Optimize images (WebP format)
- Lazy load cards below fold
- Use CSS transforms for animations (GPU accelerated)
- Minimal shadow complexity for performance

---

## 📱 **Responsive Breakpoints**

| Screen Size | Layout | Column Count |
|-------------|--------|--------------|
| **Mobile** (0-640px) | Stack vertical | 1 column |
| **Tablet** (641-1024px) | 2-column grid | 2 columns |
| **Desktop** (1025px+) | Full layout | 3-4 columns |

### **Responsive Adjustments**
- **Padding**: 32px desktop → 16px mobile
- **Font Size**: 48px desktop → 32px mobile (titles)
- **Icon Size**: 32px desktop → 24px mobile
- **Grid Gap**: 24px desktop → 12px mobile
- **Card Padding**: 24px desktop → 16px mobile

---

## 🎨 **Visual References**

### **Inspiration**
- Modern clean UI design trends (Apple, Figma style)
- Educational platform design (light, accessible)
- Contemporary Islamic design with teal/green accents
- Healthcare/wellness dashboard aesthetics
- Premium SaaS product design

### **Color Psychology**
- **White Background**: Clarity, cleanliness, modern simplicity
- **Teal/Green Accent**: Growth, health, trust, freshness
- **Dark Gray Text**: Professionalism, readability, authority
- **Blue/Purple/Orange/Green**: Different content categories (visual variety)

---

## 📦 **Deliverables**

Design should include:
1. ✅ High-fidelity mockups (Desktop + Mobile + Tablet views)
2. ✅ Component library (Reusable card designs)
3. ✅ Color palette specifications
4. ✅ Typography system with font families
5. ✅ Spacing/grid guidelines
6. ✅ Animation/interaction specifications
7. ✅ Hover/active/disabled states for all interactive elements
8. ✅ Empty state designs
9. ✅ Modal/dialog designs
10. ✅ Responsive layout breakpoints

---

## 🚀 **Ready for Design Implementation**

This specification is ready to be imported into:
- **Figma** (design mockups)
- **Stitch** (design to code)
- **Adobe XD** (design systems)
- **Sketch** (UI design)

All components follow the same design language for consistency and can be easily implemented in React with Tailwind CSS.

---

**Design Created**: May 6, 2026
**Project**: Quranic Learning Platform - Student Dashboard
**Status**: ✅ Ready for Designer Implementation
