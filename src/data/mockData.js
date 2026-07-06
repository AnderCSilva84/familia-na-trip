export const mockData = {
  currentUser: {
    id: 'member-1',
    name: 'Silva',
    fullName: 'Lucas Silva',
    role: 'superadmin',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    email: 'lucas@familianatrip.app',
  },
  trip: {
    id: 'trip-1',
    name: 'Maragogi em família',
    destination: 'Maragogi, AL',
    dateRange: '15 a 22 de jun',
    progress: 68,
    nextStop: 'Praia de Maragogi',
    nextStopTime: 'Hoje, 15:30',
    summary:
      'Uma semana entre praias, passeios de buggy, comida boa e muitos registros para guardar.',
    cover:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    budgetEstimated: 8000,
    budgetActual: 7580,
  },
  members: [
    {
      id: 'member-1',
      name: 'Silva',
      subtitle: 'Superadmin',
      role: 'superadmin',
      spend: 2850,
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    },
    {
      id: 'member-2',
      name: 'Maria',
      subtitle: 'Membro',
      role: 'member',
      spend: 1950,
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    },
    {
      id: 'member-3',
      name: 'João',
      subtitle: 'Membro',
      role: 'member',
      spend: 1300,
      avatar:
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
    },
    {
      id: 'member-4',
      name: 'Ana',
      subtitle: 'Membro',
      role: 'member',
      spend: 1010,
      avatar:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
    },
    {
      id: 'member-5',
      name: 'Pedro',
      subtitle: 'Membro',
      role: 'member',
      spend: 460,
      avatar:
        'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=200&q=80',
    },
  ],
  polls: [
    {
      id: 'poll-1',
      question: 'Qual passeio não pode ficar de fora?',
      closesIn: 'Encerra em 2 dias',
      totalVotes: 6,
      options: [
        { label: 'Maragogi', votes: 3 },
        { label: 'Piscinas Naturais', votes: 2 },
        { label: 'Passeio de Buggy', votes: 1 },
        { label: 'City Tour', votes: 0 },
      ],
    },
    {
      id: 'poll-2',
      question: 'Qual será nosso jantar especial?',
      closesIn: 'Encerra em 1 dia',
      totalVotes: 5,
      options: [
        { label: 'Frutos do Mar', votes: 3 },
        { label: 'Comida Regional', votes: 1 },
        { label: 'Pizza', votes: 1 },
      ],
    },
  ],
  itinerary: [
    {
      id: 'itinerary-1',
      day: '15',
      weekDay: 'QUI',
      title: 'Chegada em Maragogi',
      description: 'Check-in no hotel',
      time: '14:00',
      status: 'planned',
    },
    {
      id: 'itinerary-2',
      day: '16',
      weekDay: 'SEX',
      title: 'Praia de Antunes',
      description: 'Dia de praia e relax',
      time: '09:00 - 17:00',
      status: 'confirmed',
    },
    {
      id: 'itinerary-3',
      day: '17',
      weekDay: 'SAB',
      title: 'Piscinas Naturais',
      description: 'Passeio de catamarã',
      time: '06:30 - 13:00',
      status: 'confirmed',
    },
    {
      id: 'itinerary-4',
      day: '18',
      weekDay: 'DOM',
      title: 'City Tour',
      description: 'Conhecendo a cidade',
      time: '14:00 - 18:00',
      status: 'planned',
    },
  ],
  diary: [
    {
      id: 'diary-1',
      title: 'Chegada em Maragogi',
      date: '15 de Jun',
      excerpt: 'Que lugar incrível! Água cristalina e uma energia deliciosa.',
      image:
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'diary-2',
      title: 'Praia de Antunes',
      date: '16 de Jun',
      excerpt: 'Dia perfeito para relaxar em família com mar manso e sombra boa.',
      image:
        'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'diary-3',
      title: 'Piscinas Naturais',
      date: '17 de Jun',
      excerpt: 'Experiência inesquecível vendo os peixinhos de pertinho.',
      image:
        'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80',
    },
  ],
  tips: [
    {
      id: 'tip-1',
      title: 'Protetor solar é essencial',
      author: 'Maria',
      date: '16/06/2024',
      icon: '☀️',
    },
    {
      id: 'tip-2',
      title: 'Leve dinheiro em espécie',
      author: 'João',
      date: '15/06/2024',
      icon: '💸',
    },
    {
      id: 'tip-3',
      title: 'Melhor horário para praias',
      author: 'Silva',
      date: '14/06/2024',
      icon: '🌊',
    },
    {
      id: 'tip-4',
      title: 'Restaurante bom e barato',
      author: 'Ana',
      date: '13/06/2024',
      icon: '🍽️',
    },
  ],
  hotels: [
    {
      id: 'hotel-1',
      name: 'Salinas Maragogi All Inclusive',
      checkIn: '15/06/2024',
      checkOut: '22/06/2024',
      value: 3200,
      link: 'https://example.com/hotel-1',
      status: 'Confirmado',
      room: 'Quarto 101',
      image:
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 'hotel-2',
      name: 'Pousada Costa dos Corais',
      checkIn: '22/06/2024',
      checkOut: '23/06/2024',
      value: 780,
      link: 'https://example.com/hotel-2',
      status: 'Reserva flexível',
      room: 'Suíte Família',
      image:
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    },
  ],
  vehicles: [
    {
      id: 'vehicle-1',
      company: 'Localiza',
      model: 'Jeep Renegade',
      pickup: '15/06/2024 10:00',
      dropoff: '22/06/2024 10:00',
      value: 1250,
      link: 'https://example.com/vehicle-1',
      status: 'Reservado',
      location: 'Aeroporto de Maceió',
      plate: 'ABC1D23',
      image:
        'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80',
    },
  ],
  expenses: {
    estimated: 8000,
    actual: 7580,
    categories: [
      { name: 'Hospedagem', value: 3200 },
      { name: 'Alimentação', value: 2150 },
      { name: 'Transporte', value: 1250 },
      { name: 'Passeios', value: 580 },
      { name: 'Outros', value: 400 },
    ],
    byMember: [
      { name: 'Silva', value: 2850 },
      { name: 'Maria', value: 1950 },
      { name: 'João', value: 1300 },
      { name: 'Ana', value: 1010 },
      { name: 'Pedro', value: 460 },
    ],
  },
  agenda: [
    {
      id: 'agenda-1',
      time: '07:00',
      title: 'Passeio de Catamarã',
      subtitle: 'Piscinas Naturais',
      day: 17,
      active: true,
    },
    {
      id: 'agenda-2',
      time: '14:00',
      title: 'Almoço',
      subtitle: 'Restaurante Porto',
      day: 17,
      active: true,
    },
    {
      id: 'agenda-3',
      time: '20:00',
      title: 'Jantar especial',
      subtitle: 'Restaurante Beijupirá',
      day: 17,
      active: true,
    },
    {
      id: 'agenda-4',
      time: '22:30',
      title: 'Descanso',
      subtitle: 'Diariamente',
      day: 17,
      active: false,
    },
  ],
  notifications: [
    {
      id: 'notification-1',
      author: 'Maria',
      text: 'comentou no Diário',
      time: 'Há 5 min',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      type: 'comment',
    },
    {
      id: 'notification-2',
      author: 'João',
      text: 'votou na enquete',
      time: 'Há 10 min',
      avatar:
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
      type: 'poll',
    },
    {
      id: 'notification-3',
      author: 'Lembrete do alarme',
      text: 'Passeio de Catamarã às 08:30',
      time: 'Há 15 min',
      avatar: '',
      type: 'alarm',
    },
  ],
  mapMarkers: [
    {
      id: 'marker-1',
      title: 'Praia de Antunes',
      description: 'Relaxe e aproveite o paraíso',
      x: '28%',
      y: '58%',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    },
    {
      id: 'marker-2',
      title: 'Pousada Costa dos Corais',
      description: 'Sua reserva flexível',
      x: '51%',
      y: '34%',
      avatar:
        'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=200&q=80',
    },
    {
      id: 'marker-3',
      title: 'Piscinas Naturais',
      description: 'Ponto de encontro do passeio',
      x: '67%',
      y: '72%',
      avatar:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
    },
  ],
}
