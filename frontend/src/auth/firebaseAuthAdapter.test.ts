import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: { name: 'test-auth' },
  getFirebaseAuth: vi.fn(),
  onIdTokenChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('../firebase', () => ({ getFirebaseAuth: mocks.getFirebaseAuth }))
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class GoogleAuthProvider {},
  onIdTokenChanged: mocks.onIdTokenChanged,
  signInWithPopup: mocks.signInWithPopup,
  signOut: mocks.signOut,
}))

import { firebaseAuthAdapter } from './firebaseAuthAdapter'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getFirebaseAuth.mockReturnValue(mocks.auth)
})

describe('Firebase auth adapter', () => {
  it('signs in with Google and returns a Firebase ID token', async () => {
    const getIdToken = vi.fn(async () => 'firebase-id-token')
    mocks.signInWithPopup.mockResolvedValue({ user: { getIdToken } })

    await expect(firebaseAuthAdapter.signIn()).resolves.toBe('firebase-id-token')
    expect(mocks.signInWithPopup).toHaveBeenCalledWith(mocks.auth, expect.anything())
    expect(getIdToken).toHaveBeenCalledOnce()
  })

  it('emits refreshed ID tokens from Firebase auth state changes', async () => {
    let tokenObserver: ((user: { getIdToken(): Promise<string> } | null) => void) | undefined
    const unsubscribe = vi.fn()
    mocks.onIdTokenChanged.mockImplementation((_auth, next) => {
      tokenObserver = next
      return unsubscribe
    })
    const onTokenChanged = vi.fn()
    const onError = vi.fn()

    const stop = firebaseAuthAdapter.subscribe(onTokenChanged, onError)
    tokenObserver?.({ getIdToken: async () => 'refreshed-token' })

    await vi.waitFor(() => expect(onTokenChanged).toHaveBeenCalledWith('refreshed-token'))
    expect(onError).not.toHaveBeenCalled()
    stop()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('signs out of Firebase', async () => {
    mocks.signOut.mockResolvedValue(undefined)

    await firebaseAuthAdapter.signOut()

    expect(mocks.signOut).toHaveBeenCalledWith(mocks.auth)
  })
})
