import { useEffect, useState } from 'react'
import { useOnMount } from '../hooks/onMount';

export function Schedule() {
  const [talks, setTalks] = useState<{ title: string; start: Date; end: Date }[]>([])
  const [currentTalks, setCurrentTalks] = useState([])
  const [nextTalks, setNextTalks] = useState([])

  const update = async () => {
    setTalks([])
    setCurrentTalks([])
    setNextTalks([])

    try {
      const response = await fetch('https://cfp.gulas.ch/gpn22/schedule/v/0.26/widget/v2.json').then(res => res.json())
      const date = new Date()
      setTalks(response.talks.map(e => {
        const room = response.rooms.find(r => r.id === e.room)
        return {
          id: e.id,
          title: typeof e.title === "string" ? e.title : (e.title.de || e.title.en) || "Unknown",
          room: typeof room.name === "string" ? room.name : (room.name.de || room.name.en || "Unknown"),
          start: new Date(e.start),
          end: new Date(e.end)
        }
      }).filter(e => e.end > date).sort((a,b) => +a.start - +b.start))
    } catch(err) {
      console.error(err)
    }
  }

  useOnMount(() => {
    update()

    const updateInterval = setInterval(() => update(), 60000)
    return () => {
      alert("CLEAR")
      clearInterval(updateInterval)
    }
  })

  useEffect(() => {
    const date = new Date()
    
    const newCurrentTalks = talks.filter(e => e.start <= date && e.end > date)
    let newNextTalks = talks.slice(newCurrentTalks.length)

    if (newNextTalks.length) {
      newNextTalks = newNextTalks.filter(e => e.start < new Date(+newNextTalks[0].start + 2*60*60*1000))
    }

    setCurrentTalks(newCurrentTalks)
    setNextTalks(newNextTalks)
  }, [talks])

  return <div>
    <h2>Current talks</h2>
    <br />
    {currentTalks.map(({ id, title, room, start, end }) => (
      <div key={id}>
        <b>{title}</b>
        <br/>
        {room} ({start.toTimeString().split(' ')[0]} - {end.toTimeString().split(' ')[0]})
        <hr />
      </div>))}
      <br />
      <h2>Next talks</h2>
    {nextTalks.map(({ id, title, room, start, end }) => (
      <div key={id}>
        <b>{title}</b>
        <br/>
        {room} ({start.toTimeString().split(' ')[0]} - {end.toTimeString().split(' ')[0]})
        <hr />
      </div>))}
    </div>
}