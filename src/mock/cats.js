export const mockCats = [

    {
        id: 1,
        name: 'Luna',
        gender: 'Female',
        age: 2,
        country: 'Greece',
        rescuer: 'Maria',
        status: 'Awaiting Passport',
        photo: '',
        medicalStatus: 'Vaccinated',
        foster: null,
        microchip: 'GR123456789',
        passport: true,
        sterilized: true,
        fivFelv: 'Negative',
        vaccinated: true,
        rabies: true,
        bloodTests: true,
        medications: [
            'Doxycycline',
            'Vitamins'
        ],
        timeline: [
            {
                id:1,
                date:'2026-05-20',
                type:'created',
                title:'Created in IBKT'
            },
            {
                id:2,
                date:'2026-06-10',
                type:'medical',
                title:'Vaccination completed'
            },
            {
                id:3,
                date:'2026-06-15',
                type:'document',
                title:'Passport uploaded'
            },
            {
                id:4,
                date:'2026-06-18',
                type:'matching',
                title:'Matched with adopter'
            }

        ],
        documents: [
            {
                id: 1,
                name: 'Passport',
                type: 'passport',
                status: 'Uploaded',
                uploadedAt: '2026-06-15'
            },
            {
                id: 2,
                name: 'Blood Test',
                type: 'medical',
                status: 'Missing',
                uploadedAt: null
            }
        ]
    },


    {
        id: 2,
        name: 'Simba',
        gender: 'Male',
        age: 1,
        country: 'Romania',
        rescuer: 'John',
        status: 'Available',
        photo: '',
        medicalStatus: 'Healthy',
        foster: 'Anna',
        microchip: null,
        passport: false,
        sterilized: false,
        fivFelv: 'Pending',
        vaccinated: true,
        rabies: false,
        bloodTests: false,
        medications: [],
        timeline:[
            {
                id:1,
                date:'2026-06-05',
                type:'created',
                title:'Created in IBKT'
            }
        ],
        documents: [
            {
                id: 1,
                name: 'Passport',
                type: 'passport',
                status: 'Missing',
                uploadedAt: '2026-06-15'
            },
            {
                id: 2,
                name: 'Blood Test',
                type: 'medical',
                status: 'Missing',
                uploadedAt: null
            }
        ]
    },


    {
        id: 3,
        name: 'Milo',
        gender: 'Male',
        age: 4,
        country: 'Cyprus',
        rescuer: 'Sophia',
        status: 'Pending Match',
        photo: '',
        medicalStatus: 'Under Treatment',
        foster: null,
        microchip: 'CY987654321',
        passport: true,
        sterilized: true,
        fivFelv: 'Positive',
        vaccinated: true,
        rabies: true,
        bloodTests: true,
        medications: [
            'Prednisolone'
        ],
        timeline:[
            {
                id:1,
                date:'2026-06-02',
                type:'medical',
                title:'Treatment started'
            }
        ],
        documents: [
            {
                id: 1,
                name: 'Passport',
                type: 'passport',
                status: 'Uploaded',
                uploadedAt: '2026-06-15'
            },
            {
                id: 2,
                name: 'Blood Test',
                type: 'medical',
                status: 'Uploaded',
                uploadedAt: null
            }
        ]
    }


];