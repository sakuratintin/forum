import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Background from './components/Background.jsx'
import MouseParticles from './components/MouseParticles.jsx'
import { initRipple } from './utils/ripple.js'
import Home from './pages/Home.jsx'
import PostList from './pages/PostList.jsx'
import PostDetail from './pages/PostDetail.jsx'
import NewPost from './pages/NewPost.jsx'
import Login from './pages/Login.jsx'
import Profile from './pages/Profile.jsx'
import Messages from './pages/Messages.jsx'
import Admin from './pages/Admin.jsx'
import AiChat from './components/AiChat.jsx'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="route-transition">
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/section/:slug" element={<PostList />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/user/:username" element={<Profile />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:username" element={<Messages />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/new" element={<NewPost />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </div>
  )
}

export default function App() {
  useEffect(() => initRipple(), [])

  return (
    <>
      <Background />
      <MouseParticles />
      <div className="app">
        <Navbar />
        <main className="app-main">
          <AnimatedRoutes />
        </main>
        <Footer />
      </div>
      <AiChat />
    </>
  )
}
