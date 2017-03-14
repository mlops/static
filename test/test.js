describe('AddTEste', function() {
	it('should add two numbers together', function() {

		// 3 + 6 should = 9
		expect(add(3, 6)).toBe(18);
	})
});


describe('This test', function() {
	it('should always return true', function() {
		// This would fail because true !== false
		expect(true).toBe(false);
	});
})